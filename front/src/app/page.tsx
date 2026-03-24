'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ClientTabs from '@/components/ClientTabs';

const INVOICE_FIELDS = [
  { id: 'nombre',         label: 'Nombre del cliente' },
  { id: 'empresa',        label: 'Nombre de la empresa' },
  { id: 'nif',            label: 'NIF / CIF' },
  { id: 'periodo',        label: 'Periodo de facturación (mes/año)' },
  { id: 'telefono',       label: 'Número de teléfono de contacto' },
  { id: 'numero_factura', label: 'Número de factura' },
  { id: 'contrato',       label: 'Número de contrato' },
];

const INCIDENT_FIELDS = [
  { id: 'nombre',      label: 'Nombre del cliente' },
  { id: 'telefono',    label: 'Teléfono de contacto' },
  { id: 'contrato',    label: 'Número de contrato' },
  { id: 'descripcion', label: 'Descripción del problema' },
  { id: 'urgencia',    label: 'Nivel de urgencia (alta/media/baja)' },
  { id: 'producto',    label: 'Producto/servicio afectado' },
  { id: 'direccion',   label: 'Dirección' },
];

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    agentName: '',
    gender: 'female',
    company: '',
    firstMessage: '',
    servicesInfo: '',
    additionalInfo: '',
  });

  // Transferencias
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Incidencias
  const [incidentEnabled, setIncidentEnabled] = useState(false);
  const [incidentFields, setIncidentFields] = useState<string[]>(['nombre', 'telefono', 'descripcion']);
  const [incidentEmail, setIncidentEmail] = useState('');

  // Servicios
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [servicesEmail, setServicesEmail] = useState('');

  // Facturas
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
  const [invoiceFields, setInvoiceFields] = useState<string[]>(['nombre', 'nif', 'periodo', 'telefono']);
  const [invoiceEmail, setInvoiceEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasReachedLimit = (user?.agents?.length || 0) >= (user?.maxAssistants || 1);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleIncidentField = (id: string) => {
    setIncidentFields(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleInvoiceField = (id: string) => {
    setInvoiceFields(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agentName.trim()) return setError('El nombre del agente es obligatorio.');
    if (!form.company.trim()) return setError('El nombre de la empresa es obligatorio.');
    if (incidentEnabled && incidentFields.length === 0) return setError('Selecciona al menos un campo para la incidencia.');
    if (incidentEnabled && !incidentEmail.trim()) return setError('Introduce el email al que enviar las incidencias.');
    if (invoiceEnabled && invoiceFields.length === 0) return setError('Selecciona al menos un campo para las facturas.');
    if (invoiceEnabled && !invoiceEmail.trim()) return setError('Introduce el email al que enviar las solicitudes de factura.');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/agents', {
        ...form,
        transferEnabled,
        contacts,
        servicesEnabled,
        servicesEmail,
        incidentEnabled,
        incidentFields,
        incidentEmail,
        invoiceEnabled,
        invoiceFields,
        invoiceEmail,
      });
      await refreshUser();
      router.push(`/dashboard/${data.agentId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el agente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ClientTabs />
      <main className="max-w-3xl mx-auto px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Crear Agente de Recepción</h1>
          <p className="text-slate-400 mt-1">Configura un asistente virtual que atenderá llamadas entrantes de tu empresa.</p>
        </div>

        {hasReachedLimit ? (
          <div className="premium-card p-6 border-yellow-600/50 bg-yellow-900/20">
            <p className="text-yellow-400 font-medium">Has alcanzado el límite de {user?.maxAssistants} agente(s).</p>
            <p className="text-slate-400 text-sm mt-1">Elimina un agente existente o contacta al administrador para aumentar tu límite.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Datos básicos */}
            <div className="premium-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Datos básicos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre del agente *</label>
                  <input type="text" value={form.agentName} onChange={e => handleChange('agentName', e.target.value)}
                    className="input-field" placeholder="Ej: Sofía, Asistente de ACME" maxLength={60} required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Empresa *</label>
                  <input type="text" value={form.company} onChange={e => handleChange('company', e.target.value)}
                    className="input-field" placeholder="Nombre de tu empresa" maxLength={80} required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Voz del asistente</label>
                <div className="flex gap-3">
                  {(['female', 'male'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleChange('gender', g)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                        form.gender === g
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {g === 'female' ? '♀ Voz Femenina' : '♂ Voz Masculina'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Mensaje de bienvenida (opcional)</label>
                <input type="text" value={form.firstMessage} onChange={e => handleChange('firstMessage', e.target.value)}
                  className="input-field" placeholder={`Ej: Gracias por llamar a ${form.company || 'nuestra empresa'}. ¿En qué puedo ayudarle?`}
                  maxLength={300} />
              </div>
            </div>

            {/* Directorio de contactos */}
            <div className="premium-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Directorio de contactos</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {transferEnabled
                      ? 'El agente facilitará el número de teléfono cuando pregunten por un contacto.'
                      : 'Desactivado — el agente indicará que no dispone de directorio de contactos.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    transferEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    transferEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {transferEnabled && (
                <div className="space-y-3 pt-2 border-t border-slate-700">
                  <p className="text-sm font-medium text-slate-300">Contactos</p>

                  {/* Añadir contacto */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newContactName}
                      onChange={e => setNewContactName(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Nombre (ej: José)"
                      maxLength={80}
                    />
                    <input
                      type="text"
                      value={newContactPhone}
                      onChange={e => setNewContactPhone(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const name = newContactName.trim();
                          const phone = newContactPhone.trim();
                          if (name && phone) {
                            setContacts(prev => [...prev, { name, phone }]);
                            setNewContactName('');
                            setNewContactPhone('');
                          }
                        }
                      }}
                      className="input-field flex-1"
                      placeholder="+34 612 345 678"
                      style={{ maxWidth: '160px' }}
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = newContactName.trim();
                        const phone = newContactPhone.trim();
                        if (name && phone) {
                          setContacts(prev => [...prev, { name, phone }]);
                          setNewContactName('');
                          setNewContactPhone('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      Añadir
                    </button>
                  </div>

                  {/* Lista de contactos */}
                  {contacts.length > 0 && (
                    <div className="space-y-2">
                      {contacts.map((contact, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-600 bg-slate-800/50">
                          <span className="flex-1 text-sm text-slate-200">{contact.name}</span>
                          <span className="text-sm font-mono text-blue-400">{contact.phone}</span>
                          <button
                            type="button"
                            onClick={() => setContacts(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Servicios y productos */}
            <div className="premium-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Servicios y productos</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {servicesEnabled
                      ? 'El agente responderá preguntas sobre servicios y captará leads interesados.'
                      : 'Desactivado — el agente indicará que no puede informar sobre servicios por este canal.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setServicesEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    servicesEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    servicesEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {servicesEnabled && (
                <div className="space-y-4 pt-2 border-t border-slate-700">
                  <textarea value={form.servicesInfo} onChange={e => handleChange('servicesInfo', e.target.value)}
                    className="input-field min-h-[110px] resize-y"
                    placeholder="Ej: Ofrecemos servicios de mantenimiento industrial, instalación de equipos y soporte técnico 24h..."
                    maxLength={2000} />
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email para recibir leads interesados *
                    </label>
                    <input
                      type="email"
                      value={servicesEmail}
                      onChange={e => setServicesEmail(e.target.value)}
                      className="input-field"
                      placeholder="comercial@tuempresa.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">Recibirás un email cuando alguien muestre interés en contratar.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gestión de incidencias */}
            <div className="premium-card p-6 space-y-4">
              {/* Header con toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Gestión de incidencias</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {incidentEnabled
                      ? 'El agente recogerá los datos de la incidencia y te enviará un email.'
                      : 'Desactivado — el agente indicará que no gestiona incidencias por este canal.'}
                  </p>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => setIncidentEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    incidentEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    incidentEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Contenido cuando está activado */}
              {incidentEnabled && (
                <div className="space-y-4 pt-2 border-t border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-3">Campos a recoger al cliente</p>
                    <div className="grid grid-cols-2 gap-2">
                      {INCIDENT_FIELDS.map(field => (
                        <label
                          key={field.id}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                            incidentFields.includes(field.id)
                              ? 'border-blue-500/60 bg-blue-900/20 text-white'
                              : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={incidentFields.includes(field.id)}
                            onChange={() => toggleIncidentField(field.id)}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <span className="text-sm">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email para recibir las incidencias *
                    </label>
                    <input
                      type="email"
                      value={incidentEmail}
                      onChange={e => setIncidentEmail(e.target.value)}
                      className="input-field"
                      placeholder="soporte@tuempresa.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">Recibirás un email automático con los datos cada vez que se registre una incidencia.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Solicitudes de facturas */}
            <div className="premium-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Solicitudes de facturas</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {invoiceEnabled
                      ? 'El agente recogerá los datos y te enviará un email con la solicitud.'
                      : 'Desactivado — el agente indicará que no gestiona facturas por este canal.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    invoiceEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    invoiceEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {invoiceEnabled && (
                <div className="space-y-4 pt-2 border-t border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-3">Campos a solicitar al cliente</p>
                    <div className="grid grid-cols-2 gap-2">
                      {INVOICE_FIELDS.map(field => (
                        <label
                          key={field.id}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                            invoiceFields.includes(field.id)
                              ? 'border-blue-500/60 bg-blue-900/20 text-white'
                              : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={invoiceFields.includes(field.id)}
                            onChange={() => toggleInvoiceField(field.id)}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <span className="text-sm">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email para recibir las solicitudes de factura *
                    </label>
                    <input
                      type="email"
                      value={invoiceEmail}
                      onChange={e => setInvoiceEmail(e.target.value)}
                      className="input-field"
                      placeholder="administracion@tuempresa.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">Recibirás un email automático con los datos cada vez que se registre una solicitud.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instrucciones adicionales */}
            <div className="premium-card p-6 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Instrucciones adicionales</h2>
                <p className="text-slate-400 text-sm mt-1">Cualquier otro contexto o instrucción especial para el agente.</p>
              </div>
              <textarea value={form.additionalInfo} onChange={e => handleChange('additionalInfo', e.target.value)}
                className="input-field min-h-[100px] resize-y"
                placeholder="Ej: El horario de atención es de lunes a viernes de 9h a 18h. Los sábados solo urgencias..."
                maxLength={1000} />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg">{error}</p>}

            <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={loading}>
              {loading ? 'Creando agente en Vapi...' : 'Crear Agente de Recepción'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
