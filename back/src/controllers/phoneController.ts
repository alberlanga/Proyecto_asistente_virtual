import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY!;

async function registerInVapi(number: string, sipDomain: string, sipUser: string, sipPassword: string) {
  const credRes = await fetch('https://api.vapi.ai/credential', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'byo-sip-trunk',
      name: `sip-${number}`,
      gateways: [{ ip: sipDomain, port: 5060 }],
      outboundAuthenticationPlan: {
        authUsername: sipUser,
        authPassword: sipPassword,
        sipRegisterPlan: { domain: sipDomain, username: sipUser },
      },
      outboundLeadingPlusEnabled: false,
    }),
  });
  const credData = await credRes.json();
  if (!credRes.ok) throw new Error(`Vapi credential: ${JSON.stringify(credData)}`);

  const numRes = await fetch('https://api.vapi.ai/phone-number', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'byo-phone-number',
      name: number,
      number: number.startsWith('+') ? number : `+34${number}`,
      credentialId: credData.id,
      numberE164CheckEnabled: false,
    }),
  });
  const numData = await numRes.json();
  if (!numRes.ok) throw new Error(`Vapi phone-number: ${JSON.stringify(numData)}`);

  return { vapiPhoneNumberId: numData.id, vapiCredentialId: credData.id };
}

export const getAvailableNumbers = async (req: AuthRequest, res: Response) => {
  try {
    const numbers = await prisma.phoneNumber.findMany({
      where: { userId: null, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, number: true, vapiPhoneNumberId: true, createdAt: true },
    });
    res.json(numbers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyNumbers = async (req: AuthRequest, res: Response) => {
  try {
    const numbers = await prisma.phoneNumber.findMany({
      where: { userId: req.user!.userId },
      include: { agents: { select: { id: true, agentName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(numbers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const claimNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumberId } = req.body;
    if (!phoneNumberId) return res.status(400).json({ error: 'Se requiere phoneNumberId.' });

    const phone = await prisma.phoneNumber.findUnique({ where: { id: phoneNumberId } });
    if (!phone || !phone.isActive) return res.status(404).json({ error: 'Número no encontrado.' });
    if (phone.userId) return res.status(400).json({ error: 'Este número ya está en uso.' });

    const userNumbers = await prisma.phoneNumber.count({ where: { userId: req.user!.userId } });
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (userNumbers >= (user!.maxPhoneNumbers)) {
      return res.status(400).json({ error: `Has alcanzado tu límite de ${user!.maxPhoneNumbers} número(s).` });
    }

    let { vapiPhoneNumberId, vapiCredentialId } = phone;
    if (!vapiPhoneNumberId && phone.sipDomain && phone.sipUser && phone.sipPassword) {
      const result = await registerInVapi(phone.number, phone.sipDomain, phone.sipUser, phone.sipPassword);
      vapiPhoneNumberId = result.vapiPhoneNumberId;
      vapiCredentialId = result.vapiCredentialId;
    }

    const updated = await prisma.phoneNumber.update({
      where: { id: phoneNumberId },
      data: { userId: req.user!.userId, vapiPhoneNumberId, vapiCredentialId },
      include: { agents: { select: { id: true, agentName: true } } },
    });

    res.json({ success: true, phoneNumber: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const releaseNumber = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const phone = await prisma.phoneNumber.findUnique({ where: { id } });
    if (!phone) return res.status(404).json({ error: 'Número no encontrado.' });
    if (phone.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Sin permiso.' });
    }

    await prisma.agent.updateMany({ where: { phoneNumberId: id }, data: { phoneNumberId: null } });
    await prisma.phoneNumber.update({ where: { id }, data: { userId: null } });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const assignNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumberId, agentId } = req.body;

    if (phoneNumberId) {
      const phone = await prisma.phoneNumber.findUnique({ where: { id: phoneNumberId } });
      if (!phone || (phone.userId !== req.user!.userId && req.user!.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Sin permiso sobre este número.' });
      }

      // Comprobar si el número ya está asignado a otro agente
      const agentWithNumber = await prisma.agent.findFirst({
        where: { phoneNumberId, NOT: { id: agentId } },
      });
      if (agentWithNumber) {
        return res.status(409).json({
          error: `Este número ya está asignado al asistente "${agentWithNumber.agentName}". Quítaselo primero antes de asignarlo aquí.`,
        });
      }
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || (agent.userId !== req.user!.userId && req.user!.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Sin permiso sobre este agente.' });
    }

    // Si el agente tenía un número anterior, limpiar el assistantId en Vapi de ese número
    if (agent.phoneNumberId && agent.phoneNumberId !== phoneNumberId) {
      const oldPhone = await prisma.phoneNumber.findUnique({ where: { id: agent.phoneNumberId } });
      if (oldPhone?.vapiPhoneNumberId) {
        try {
          await fetch(`https://api.vapi.ai/phone-number/${oldPhone.vapiPhoneNumberId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistantId: null }),
          });
        } catch (e) {
          console.error('[VAPI] Error limpiando asistente del número anterior:', e);
        }
      }
    }

    // Asignar el asistente al nuevo número en Vapi (inbound routing)
    if (agent.assistant_id && phoneNumberId) {
      const phone = await prisma.phoneNumber.findUnique({ where: { id: phoneNumberId } });
      if (phone?.vapiPhoneNumberId) {
        try {
          await fetch(`https://api.vapi.ai/phone-number/${phone.vapiPhoneNumberId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistantId: agent.assistant_id }),
          });
        } catch (e) {
          console.error('[VAPI] Error asignando asistente al número:', e);
        }
      }
    }

    await prisma.agent.update({ where: { id: agentId }, data: { phoneNumberId: phoneNumberId || null } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getPool = async (req: AuthRequest, res: Response) => {
  try {
    const numbers = await prisma.phoneNumber.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });
    res.json(numbers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const addToPool = async (req: AuthRequest, res: Response) => {
  try {
    const { number: rawNumber, sipDomain, sipUser, sipPassword, force } = req.body;
    if (!rawNumber) return res.status(400).json({ error: 'Se requiere el número.' });

    // Sanitizar: eliminar espacios, guiones y otros caracteres no válidos para Vapi
    const number = rawNumber.replace(/[^+\d]/g, '');

    // 1. Comprobar si ya está en nuestro pool
    const existing = await prisma.phoneNumber.findUnique({ where: { number } });
    if (existing) {
      return res.status(400).json({ error: `El número ${number} ya está configurado en el pool.` });
    }

    let vapiPhoneNumberId: string | null = null;
    let vapiCredentialId: string | null = null;

    if (sipDomain && sipUser && sipPassword) {
      const normalizedNumber = number.startsWith('+') ? number : `+34${number}`;

      // 2. Comprobar si el número ya existe en Vapi
      const vapiNumRes = await fetch('https://api.vapi.ai/phone-number', {
        headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` },
      });
      const vapiNumbers = await vapiNumRes.json();
      const existingVapiNumber = Array.isArray(vapiNumbers)
        ? vapiNumbers.find((n: any) => n.number === normalizedNumber)
        : null;

      if (existingVapiNumber && !force) {
        return res.status(409).json({
          error: `El número ${number} ya está registrado en Vapi. ¿Seguro que quieres configurarlo en la app?`,
          vapiExists: true,
          vapiPhoneNumberId: existingVapiNumber.id,
          vapiCredentialId: existingVapiNumber.credentialId || null,
        });
      }

      if (existingVapiNumber && force) {
        // Reusar los IDs existentes de Vapi
        vapiPhoneNumberId = existingVapiNumber.id;
        vapiCredentialId = existingVapiNumber.credentialId || null;
      } else {
        // 3. Comprobar si el usuario SIP ya tiene credential en Vapi
        const vapiCredRes = await fetch('https://api.vapi.ai/credential', {
          headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` },
        });
        const vapiCreds = await vapiCredRes.json();
        const existingCred = Array.isArray(vapiCreds)
          ? vapiCreds.find((c: any) => c.outboundAuthenticationPlan?.authUsername === sipUser)
          : null;

        let credId: string;
        if (existingCred) {
          // Reusar credential existente
          credId = existingCred.id;
        } else {
          // Crear nueva credential SIP
          const credRes = await fetch('https://api.vapi.ai/credential', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'byo-sip-trunk',
              name: `sip-${number}`,
              gateways: [{ ip: sipDomain, port: 5060 }],
              outboundAuthenticationPlan: {
                authUsername: sipUser,
                authPassword: sipPassword,
                sipRegisterPlan: { domain: sipDomain, username: sipUser },
              },
              outboundLeadingPlusEnabled: false,
            }),
          });
          const credData = await credRes.json();
          if (!credRes.ok) throw new Error(`Vapi credential: ${JSON.stringify(credData)}`);
          credId = credData.id;
        }

        // Crear phone number en Vapi
        const numRes = await fetch('https://api.vapi.ai/phone-number', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'byo-phone-number',
            name: number,
            number: normalizedNumber,
            credentialId: credId,
            numberE164CheckEnabled: false,
          }),
        });
        const numData = await numRes.json();
        if (!numRes.ok) throw new Error(`Vapi phone-number: ${JSON.stringify(numData)}`);

        vapiPhoneNumberId = numData.id;
        vapiCredentialId = credId;
      }
    }

    const phone = await prisma.phoneNumber.create({
      data: {
        number,
        sipDomain: sipDomain || null,
        sipUser: sipUser || null,
        sipPassword: sipPassword || null,
        vapiPhoneNumberId,
        vapiCredentialId,
      },
    });

    res.json({ success: true, phoneNumber: phone });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteFromPool = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const phone = await prisma.phoneNumber.findUnique({ where: { id } });
    if (!phone) return res.status(404).json({ error: 'Número no encontrado.' });

    await prisma.agent.updateMany({ where: { phoneNumberId: id }, data: { phoneNumberId: null } });

    if (phone.vapiPhoneNumberId) {
      await fetch(`https://api.vapi.ai/phone-number/${phone.vapiPhoneNumberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` },
      });
    }
    if (phone.vapiCredentialId) {
      await fetch(`https://api.vapi.ai/credential/${phone.vapiCredentialId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` },
      });
    }

    await prisma.phoneNumber.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
