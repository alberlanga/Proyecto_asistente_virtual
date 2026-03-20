const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const MAILGUN_FROM = process.env.MAILGUN_FROM!;
const MAILGUN_API_URL = process.env.MAILGUN_API_URL!;

async function sendMailgun(to: string, subject: string, html: string) {
  const url = `${MAILGUN_API_URL}/v3/${MAILGUN_DOMAIN}/messages`;

  const body = new URLSearchParams();
  body.append('from', MAILGUN_FROM);
  body.append('to', to);
  body.append('subject', subject);
  body.append('html', html);

  const credentials = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mailgun error (${res.status}): ${err}`);
  }
}

export interface IncidentEmailData {
  to: string;
  agentName: string;
  company: string;
  callerPhone: string | null;
  summary: string | null;
  fields: Record<string, string>;
  callDate: string;
}

export const sendIncidentEmail = async (data: IncidentEmailData) => {
  const { to, agentName, company, callerPhone, summary, fields, callDate } = data;

  const fieldsHtml = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#94a3b8;font-size:14px;">${k}</td><td style="padding:6px 12px;color:#f1f5f9;font-size:14px;">${v}</td></tr>`)
    .join('');

  const html = `
  <div style="background:#0f172a;color:#f1f5f9;font-family:Inter,sans-serif;padding:32px;border-radius:12px;max-width:600px;margin:0 auto;">
    <h2 style="color:#f1f5f9;margin-bottom:4px;">🚨 Nueva Incidencia Registrada</h2>
    <p style="color:#64748b;margin-top:0;margin-bottom:24px;">${agentName} · ${company} · ${callDate}</p>

    <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#334155;">
          <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Campo</th>
          <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Dato recogido</th>
        </tr>
      </thead>
      <tbody>
        ${callerPhone ? `<tr><td style="padding:6px 12px;color:#94a3b8;font-size:14px;">Teléfono de llamada</td><td style="padding:6px 12px;color:#f1f5f9;font-size:14px;font-family:monospace;">${callerPhone}</td></tr>` : ''}
        ${fieldsHtml}
      </tbody>
    </table>

    ${summary ? `
    <div style="background:#1e293b;border-left:3px solid #3b82f6;padding:12px 16px;border-radius:4px;">
      <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Resumen de la llamada</p>
      <p style="color:#f1f5f9;font-size:14px;margin:0;">${summary}</p>
    </div>` : ''}

    <p style="color:#475569;font-size:12px;margin-top:24px;">Enviado automáticamente por Reception AI Manager</p>
  </div>`;

  await sendMailgun(to, `[Incidencia] ${company} — ${callerPhone || 'Número desconocido'} — ${callDate}`, html);
  console.log(`[EMAIL] ✅ Incidencia enviada a ${to}`);
};

export interface InvoiceEmailData {
  to: string;
  agentName: string;
  company: string;
  callerPhone: string | null;
  summary: string | null;
  fields: Record<string, string>;
  callDate: string;
}

export const sendInvoiceEmail = async (data: InvoiceEmailData) => {
  const { to, agentName, company, callerPhone, summary, fields, callDate } = data;

  const fieldsHtml = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#94a3b8;font-size:14px;">${k}</td><td style="padding:6px 12px;color:#f1f5f9;font-size:14px;">${v}</td></tr>`)
    .join('');

  const html = `
  <div style="background:#0f172a;color:#f1f5f9;font-family:Inter,sans-serif;padding:32px;border-radius:12px;max-width:600px;margin:0 auto;">
    <h2 style="color:#f1f5f9;margin-bottom:4px;">🧾 Nueva Solicitud de Factura</h2>
    <p style="color:#64748b;margin-top:0;margin-bottom:24px;">${agentName} · ${company} · ${callDate}</p>

    <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#334155;">
          <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Campo</th>
          <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Dato recogido</th>
        </tr>
      </thead>
      <tbody>
        ${callerPhone ? `<tr><td style="padding:6px 12px;color:#94a3b8;font-size:14px;">Teléfono de llamada</td><td style="padding:6px 12px;color:#f1f5f9;font-size:14px;font-family:monospace;">${callerPhone}</td></tr>` : ''}
        ${fieldsHtml}
      </tbody>
    </table>

    ${summary ? `
    <div style="background:#1e293b;border-left:3px solid #8b5cf6;padding:12px 16px;border-radius:4px;">
      <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Resumen de la llamada</p>
      <p style="color:#f1f5f9;font-size:14px;margin:0;">${summary}</p>
    </div>` : ''}

    <p style="color:#475569;font-size:12px;margin-top:24px;">Enviado automáticamente por Reception AI Manager</p>
  </div>`;

  await sendMailgun(to, `[Factura] ${company} — ${callerPhone || 'Número desconocido'} — ${callDate}`, html);
  console.log(`[EMAIL] ✅ Solicitud de factura enviada a ${to}`);
};
