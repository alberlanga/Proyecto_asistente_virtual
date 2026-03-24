import { VapiClient } from '@vapi-ai/server-sdk';
import { getServerUrl } from '../utils/serverUrl';

const vapi = new VapiClient({ token: process.env.VAPI_PRIVATE_KEY || '' });

const VOICES = {
  female: 'dHdIIFZMLzs6XfsGtmIP',
  male: 'CAEve7xpu0AvVWiKm2px',
};

const TRANSCRIBER = {
  provider: 'deepgram' as const,
  model: 'nova-2' as const,
  language: 'es' as const,
};

// Etiquetas legibles de cada campo de incidencia
export const INCIDENT_FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre del cliente',
  telefono: 'Teléfono de contacto',
  email: 'Email del cliente',
  contrato: 'Número de contrato',
  descripcion: 'Descripción del problema',
  urgencia: 'Nivel de urgencia (alta/media/baja)',
  producto: 'Producto o servicio afectado',
  direccion: 'Dirección',
};

// Etiquetas legibles de cada campo de transferencia
export const TRANSFER_FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre del cliente',
  telefono: 'Teléfono de contacto',
  persona: 'Con quién desea hablar (nombre o puesto)',
  motivo: 'Motivo de la llamada o mensaje',
  horario: 'Mejor horario para recibir la llamada',
};

// Etiquetas legibles de cada campo de factura
export const INVOICE_FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre del cliente',
  empresa: 'Nombre de la empresa',
  nif: 'NIF / CIF',
  periodo: 'Periodo de facturación (mes/año)',
  telefono: 'Número de teléfono de contacto',
  numero_factura: 'Número de factura',
  contrato: 'Número de contrato',
};

interface Contact {
  name: string;
  phone: string;
}

interface CreateAssistantParams {
  agentId: string;
  agentName: string;
  gender: string;
  company: string;
  firstMessage: string;
  contacts: Contact[];
  transferEnabled: boolean;
  transferFields: string[];
  servicesEnabled: boolean;
  servicesInfo: string;
  servicesEmail: string;
  incidentEnabled: boolean;
  incidentFields: string[];
  invoiceEnabled: boolean;
  invoiceFields: string[];
  additionalInfo: string;
}

export const createVapiAssistant = async (params: CreateAssistantParams): Promise<string> => {
  const { agentId, agentName, gender, company, firstMessage, contacts, transferEnabled, transferFields,
    servicesEnabled, servicesInfo, servicesEmail, incidentEnabled, incidentFields, invoiceEnabled, invoiceFields, additionalInfo } = params;

  const companyLine = company ? `Trabajas para la empresa "${company}".` : '';

  // Sección de transferencias
  let transferSection: string;
  if (!transferEnabled) {
    transferSection = `\nPETICIONES DE HABLAR CON ALGUIEN:\nNo gestionas peticiones de transferencia. Si el cliente quiere hablar con alguien, indícale amablemente que no está disponible este canal y ofrécele otros medios de contacto.`;
  } else {
    const contactList = (contacts || []).length > 0
      ? `\nDirectorio:\n${contacts.map(c => `  - ${c.name}: ${c.phone}`).join('\n')}`
      : '';
    transferSection = `\nDIRECTORIO DE CONTACTOS:\nCuando un cliente pregunte por una persona concreta, busca su nombre en el directorio y facilítale su número de teléfono directo para que pueda llamarle.${contactList}\nSi la persona no está en el directorio, indícale amablemente que no dispones de ese contacto.`;
  }

  let servicesSection: string;
  if (!servicesEnabled) {
    servicesSection = `\nSERVICIOS Y PRODUCTOS:\nNo gestionas consultas sobre servicios o productos. Si un cliente pregunta, indícale amablemente que no está disponible este canal y ofrécele otros medios de contacto.`;
  } else {
    servicesSection = servicesInfo?.trim()
      ? `\nINFORMACIÓN DE SERVICIOS Y PRODUCTOS:\n${servicesInfo}\nSi un cliente muestra interés en contratar, recoge su nombre, teléfono y servicio de interés e indícale que un comercial le contactará.`
      : '';
  }

  // Sección de incidencias según si está activada
  let incidentSection: string;
  if (!incidentEnabled) {
    incidentSection = `\nGESTIÓN DE INCIDENCIAS:\nNo gestionas incidencias. Si un cliente llama para reportar un problema o avería, indícale amablemente que no está disponible este canal para incidencias y ofrécele otros medios de contacto si los hay.`;
  } else {
    const fieldList = incidentFields
      .map(f => `  - ${INCIDENT_FIELD_LABELS[f] || f}`)
      .join('\n');
    incidentSection = `\nGESTIÓN DE INCIDENCIAS:\nCuando un cliente reporte un problema o avería, debes recoger los siguientes datos uno a uno de forma amable:\n${fieldList}\nUna vez recogidos todos los datos, confirma al cliente que has registrado la incidencia y que alguien se pondrá en contacto con él lo antes posible.`;
  }

  let invoiceSection: string;
  if (!invoiceEnabled) {
    invoiceSection = `\nSOLICITUDES DE FACTURAS:\nNo gestionas solicitudes de facturas. Si un cliente llama para pedirlas, indícale amablemente que no está disponible este canal y ofrécele otros medios de contacto.`;
  } else {
    const invoiceFieldList = invoiceFields
      .map(f => `  - ${INVOICE_FIELD_LABELS[f] || f}`)
      .join('\n');
    invoiceSection = `\nSOLICITUDES DE FACTURAS:\nCuando un cliente solicite una factura, recoge los siguientes datos uno a uno:\n${invoiceFieldList}\nUna vez recogidos, confirma al cliente que la factura será procesada y enviada en breve.`;
  }

  const additionalSection = additionalInfo?.trim()
    ? `\nINSTRUCCIONES ADICIONALES:\n${additionalInfo}`
    : '';

  // Lista de tipos gestionados según configuración
  const managedTypes: string[] = [];
  if (incidentEnabled) managedTypes.push('- INCIDENCIAS: El cliente reporta un problema o avería.');
  if (transferEnabled) managedTypes.push('- PETICIONES DE HABLAR CON ALGUIEN: El cliente quiere que una persona concreta le llame.');
  if (servicesEnabled) managedTypes.push('- PREGUNTAS SOBRE SERVICIOS/PRODUCTOS: El cliente quiere información sobre lo que ofrece la empresa.');
  if (invoiceEnabled) managedTypes.push('- SOLICITUDES DE FACTURAS: El cliente necesita una factura.');
  managedTypes.push('- CREACIÓN DE LEADS: Un potencial cliente interesado en contratar servicios. Recoge: nombre, empresa (si aplica), servicio de interés, teléfono y email de contacto.');

  const systemPrompt = `Eres ${agentName}, asistente virtual de recepción telefónica. ${companyLine}
Tu misión es atender llamadas entrantes de manera profesional y amable, gestionando los siguientes tipos de solicitudes:

${managedTypes.join('\n')}
${transferSection}${servicesSection}${incidentSection}${invoiceSection}${additionalSection}

REGLAS GENERALES:
- Saluda siempre de forma cálida y profesional.
- Identifica rápidamente el motivo de la llamada.
- Si necesitas transferir, indica a quién y que espere un momento.
- Si no puedes resolver algo, ofrece tomar los datos para que alguien llame de vuelta.
- Al despedirte, resume brevemente la gestión realizada.
- Habla siempre en español, de forma clara y concisa.`;

  const resolvedFirstMessage = firstMessage?.trim() ||
    (company
      ? `Gracias por llamar a ${company}. Soy ${agentName}, ¿en qué puedo ayudarle?`
      : `Gracias por su llamada. Soy ${agentName}, ¿en qué puedo ayudarle?`);

  const voiceId = VOICES[gender as keyof typeof VOICES] || VOICES.female;

  const assistant = await vapi.assistants.create({
    name: `${agentName} - ${agentId.substring(0, 8)}`,
    transcriber: TRANSCRIBER,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
    },
    voice: {
      provider: '11labs',
      voiceId,
      model: 'eleven_flash_v2_5',
    },
    firstMessage: resolvedFirstMessage,
    endCallMessage: 'Ha sido un placer atenderle. Que tenga un buen día. Hasta pronto.',
    serverUrl: `${getServerUrl()}/api/vapi/webhook`,
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
  } as any);

  console.log(`[VAPI] ✅ Asistente de recepción creado: ${assistant.id}`);
  return assistant.id!;
};

export const deleteVapiAssistant = async (assistantId: string): Promise<void> => {
  const id = assistantId.trim();
  const response = await fetch(`https://api.vapi.ai/assistant/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}` },
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`Vapi DELETE failed (${response.status}): ${body}`);
  }
};
