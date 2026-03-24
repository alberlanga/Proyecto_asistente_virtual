import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { createVapiAssistant, deleteVapiAssistant } from '../services/vapiService';

export const createAgent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      agentName, gender, company, firstMessage,
      transferEnabled, contacts,
      servicesEnabled, servicesInfo, servicesEmail,
      incidentEnabled, incidentFields, incidentEmail,
      invoiceEnabled, invoiceFields, invoiceEmail,
      additionalInfo
    } = req.body;

    const contactsArray: { name: string; phone: string }[] = Array.isArray(contacts) ? contacts : [];

    if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado.' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { agents: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.agents.length >= user.maxAssistants) {
      return res.status(403).json({
        error: `Has alcanzado tu límite máximo de ${user.maxAssistants} asistente(s). Elimina uno o contacta al administrador.`
      });
    }

    const incidentFieldsArray: string[] = Array.isArray(incidentFields) ? incidentFields : [];
    const invoiceFieldsArray: string[] = Array.isArray(invoiceFields) ? invoiceFields : [];

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        agentName: agentName || 'Recepcionista Virtual',
        gender: gender || 'female',
        company: company || '',
        firstMessage: firstMessage || '',
        transferEnabled: transferEnabled === true || transferEnabled === 'true',
        contacts: JSON.stringify(contactsArray),
        servicesEnabled: servicesEnabled !== false && servicesEnabled !== 'false',
        servicesInfo: servicesInfo || '',
        servicesEmail: servicesEmail || '',
        incidentEnabled: incidentEnabled === true || incidentEnabled === 'true',
        incidentFields: JSON.stringify(incidentFieldsArray),
        incidentEmail: incidentEmail || '',
        invoiceEnabled: invoiceEnabled === true || invoiceEnabled === 'true',
        invoiceFields: JSON.stringify(invoiceFieldsArray),
        invoiceEmail: invoiceEmail || '',
        additionalInfo: additionalInfo || '',
      }
    });

    let assistantId: string | null = null;
    try {
      assistantId = await createVapiAssistant({
        agentId: agent.id,
        agentName: agent.agentName || 'Recepcionista Virtual',
        gender: agent.gender || 'female',
        company: agent.company || '',
        firstMessage: agent.firstMessage || '',
        transferEnabled: agent.transferEnabled,
        contacts: contactsArray,
        servicesEnabled: agent.servicesEnabled,
        servicesInfo: agent.servicesInfo || '',
        servicesEmail: agent.servicesEmail || '',
        incidentEnabled: agent.incidentEnabled,
        incidentFields: incidentFieldsArray,
        invoiceEnabled: agent.invoiceEnabled,
        invoiceFields: invoiceFieldsArray,
        additionalInfo: agent.additionalInfo || '',
      });

      await prisma.agent.update({
        where: { id: agent.id },
        data: { assistant_id: assistantId.trim() }
      });
    } catch (vapiErr: any) {
      console.error(`[VAPI] ⚠️ Error creando asistente: ${vapiErr.message}`);
    }

    res.json({ success: true, agentId: agent.id, assistantId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAgents = async (req: AuthRequest, res: Response) => {
  try {
    const whereClause: any = req.user?.role === 'ADMIN' ? {} : { userId: req.user?.userId };
    const agents = await prisma.agent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });

    if (req.user?.role !== 'ADMIN' && agent.userId !== req.user?.userId) {
      return res.status(403).json({ error: 'No tienes permiso para borrar este agente' });
    }

    if (agent.assistant_id) {
      try {
        await deleteVapiAssistant(agent.assistant_id.trim());
      } catch (e: any) {
        console.error(`[VAPI] ⚠️ Error eliminando asistente: ${e.message}`);
      }
    }

    await prisma.call.deleteMany({ where: { agentId: id } });
    await prisma.agent.delete({ where: { id } });

    res.json({ success: true, message: 'Agente eliminado correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
