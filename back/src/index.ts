import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import prisma from './utils/prisma';
import cookieParser from 'cookie-parser';
import { login, me, logout } from './controllers/authController';
import { getUsers, createUser, updateUserLimit, getUserDetail } from './controllers/adminController';
import { createAgent, getAgents, deleteAgent } from './controllers/agentController';
import { getDashboardStats } from './controllers/callController';
import { getAvailableNumbers, getMyNumbers, claimNumber, releaseNumber, assignNumber, getPool, addToPool, deleteFromPool } from './controllers/phoneController';
import { requireAuth, requireAdmin } from './middleware/auth';
import { setServerUrl, getServerUrl } from './utils/serverUrl';
import { sendIncidentEmail, sendInvoiceEmail } from './services/emailService';
import { INCIDENT_FIELD_LABELS, INVOICE_FIELD_LABELS } from './services/vapiService';

const app = express();

app.use(cors({
  origin: 'http://localhost:3002',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// -- Auth --
app.post('/api/auth/login', login);
app.get('/api/auth/me', requireAuth, me);
app.post('/api/auth/logout', logout);

// -- Admin: Users --
app.get('/api/admin/users', requireAuth, requireAdmin, getUsers);
app.get('/api/admin/users/:id', requireAuth, requireAdmin, getUserDetail);
app.post('/api/admin/users', requireAuth, requireAdmin, createUser);
app.put('/api/admin/users/:id/limit', requireAuth, requireAdmin, updateUserLimit);

// -- Admin: Phone pool --
app.get('/api/admin/phones', requireAuth, requireAdmin, getPool);
app.post('/api/admin/phones', requireAuth, requireAdmin, addToPool);
app.delete('/api/admin/phones/:id', requireAuth, requireAdmin, deleteFromPool);

// -- Agents --
app.post('/api/agents', requireAuth, createAgent);
app.get('/api/agents', requireAuth, getAgents);
app.delete('/api/agents/:id', requireAuth, deleteAgent);

// -- Phone numbers (user) --
app.get('/api/phones/available', requireAuth, getAvailableNumbers);
app.get('/api/phones', requireAuth, getMyNumbers);
app.post('/api/phones/claim', requireAuth, claimNumber);
app.delete('/api/phones/:id', requireAuth, releaseNumber);
app.put('/api/phones/assign', requireAuth, assignNumber);

// -- Dashboard / Call history --
app.get('/api/calls/dashboard/:agentId', requireAuth, getDashboardStats);

// -- Vapi Webhook --
app.post('/api/vapi/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('=> VAPI Webhook:', payload?.message?.type);

    if (payload?.message?.type === 'end-of-call-report' && payload.message.call) {
      const call = payload.message.call;
      const callerPhone = call.customer?.number || null;
      const cost = payload.message.cost ?? call.cost ?? 0;
      const durationRaw = payload.message.durationSeconds ?? payload.message.duration ?? call.duration ?? null;
      const duration = durationRaw ? Math.round(durationRaw) : null;
      const endedReason = call.endedReason || '';

      // Intentar extraer tipo de llamada y resumen del análisis de Vapi
      const analysis = payload.message.analysis || {};
      const callType = analysis.structuredData?.call_type || null;
      const summary = analysis.summary || null;

      // Buscar el agente por el vapiPhoneNumberId o por assistant_id
      const assistantId = call.assistant?.id || call.assistantId;

      if (assistantId) {
        const agent = await prisma.agent.findFirst({
          where: { assistant_id: assistantId }
        });

        if (agent) {
          await prisma.call.create({
            data: {
              agentId: agent.id,
              caller_phone: callerPhone,
              status: (endedReason === 'customer-hung-up' || endedReason === 'assistant-hung-up') ? 'completed' : 'failed',
              cost,
              duration,
              call_type: callType,
              summary,
            }
          });
          console.log(`[WEBHOOK] Llamada de ${callerPhone} registrada en agente ${agent.id}`);

          // Enviar email de incidencia si corresponde
          if (
            callType === 'incidencia' &&
            agent.incidentEnabled &&
            agent.incidentEmail
          ) {
            try {
              const fieldsArray: string[] = agent.incidentFields
                ? JSON.parse(agent.incidentFields)
                : [];

              // Extraer valores de los campos del structuredData de Vapi si existen
              const structuredData = analysis.structuredData || {};
              const fieldValues: Record<string, string> = {};
              for (const fieldId of fieldsArray) {
                const label = INCIDENT_FIELD_LABELS[fieldId] || fieldId;
                fieldValues[label] = structuredData[fieldId] || '';
              }

              await sendIncidentEmail({
                to: agent.incidentEmail,
                agentName: agent.agentName || 'Recepcionista Virtual',
                company: agent.company || '',
                callerPhone,
                summary,
                fields: fieldValues,
                callDate: new Date().toLocaleString('es-ES'),
              });
            } catch (emailErr: any) {
              console.error(`[EMAIL] ⚠️ Error enviando email de incidencia: ${emailErr.message}`);
            }
          }

          // Enviar email de factura si corresponde
          if (
            callType === 'factura' &&
            agent.invoiceEnabled &&
            agent.invoiceEmail
          ) {
            try {
              const invoiceFieldsArray: string[] = agent.invoiceFields
                ? JSON.parse(agent.invoiceFields)
                : [];
              const structuredData = analysis.structuredData || {};
              const fieldValues: Record<string, string> = {};
              for (const fieldId of invoiceFieldsArray) {
                const label = INVOICE_FIELD_LABELS[fieldId] || fieldId;
                fieldValues[label] = structuredData[fieldId] || '';
              }
              await sendInvoiceEmail({
                to: agent.invoiceEmail,
                agentName: agent.agentName || 'Recepcionista Virtual',
                company: agent.company || '',
                callerPhone,
                summary,
                fields: fieldValues,
                callDate: new Date().toLocaleString('es-ES'),
              });
            } catch (emailErr: any) {
              console.error(`[EMAIL] ⚠️ Error enviando email de factura: ${emailErr.message}`);
            }
          }
        }
      }
    }

    res.status(200).send();
  } catch (err) {
    console.error('Error procesando webhook:', err);
    res.status(500).send();
  }
});

const PORT = parseInt(process.env.PORT || '3003');
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY!;

app.listen(PORT, async () => {
  console.log(`✅ Servidor Recepción corriendo en http://localhost:${PORT}`);

  if (process.env.NGROK_AUTHTOKEN) {
    try {
      const ngrok = await import('@ngrok/ngrok');
      const listener = await ngrok.forward({
        addr: PORT,
        authtoken: process.env.NGROK_AUTHTOKEN,
      });
      const publicUrl = listener.url()!;
      const webhookUrl = `${publicUrl}/api/vapi/webhook`;
      setServerUrl(publicUrl);
      console.log(`✅ Ngrok tunnel activo: ${publicUrl}`);

      // Actualizar serverUrl en todos los asistentes de Vapi
      const agents = await prisma.agent.findMany({
        where: { assistant_id: { not: null } },
      });

      console.log(`[VAPI] Actualizando serverUrl en ${agents.length} asistente(s)...`);
      let updated = 0;
      for (const agent of agents) {
        try {
          const res = await fetch(`https://api.vapi.ai/assistant/${agent.assistant_id!.trim()}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverUrl: webhookUrl,
              analysisPlan: {
                summaryPrompt: 'Resume en español en 2-3 frases el motivo de la llamada y cómo se resolvió. Sé conciso y usa español neutro.',
                structuredDataPrompt: 'Extrae en JSON: call_type (uno de: incidencia, transferencia, factura, pregunta_servicio, lead, otro), y los datos recogidos durante la llamada según el tipo.',
                structuredDataSchema: {
                  type: 'object',
                  properties: {
                    call_type: { type: 'string', enum: ['incidencia', 'transferencia', 'factura', 'pregunta_servicio', 'lead', 'otro'] },
                    nombre: { type: 'string' }, telefono: { type: 'string' }, email: { type: 'string' },
                    contrato: { type: 'string' }, descripcion: { type: 'string' }, urgencia: { type: 'string' },
                    producto: { type: 'string' }, direccion: { type: 'string' }, empresa: { type: 'string' },
                    nif: { type: 'string' }, periodo: { type: 'string' }, numero_factura: { type: 'string' },
                  },
                },
              },
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error(`[VAPI] Error en asistente ${agent.assistant_id}: ${JSON.stringify(data)}`);
          } else {
            updated++;
            console.log(`[VAPI] ✅ Asistente ${agent.agentName} (${agent.assistant_id}) → ${webhookUrl}`);
          }
        } catch (e: any) {
          console.error(`[VAPI] Error actualizando serverUrl del asistente ${agent.assistant_id}: ${e.message}`);
        }
      }

      console.log(`✅ serverUrl actualizado en ${updated} asistente(s) de Vapi → ${webhookUrl}`);
    } catch (err: any) {
      console.error(`[NGROK] Error arrancando tunnel: ${err.message}`);
    }
  }
});
