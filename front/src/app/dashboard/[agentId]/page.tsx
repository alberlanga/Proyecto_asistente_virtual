'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ClientTabs from '@/components/ClientTabs';

interface Call {
  id: string;
  caller_phone: string | null;
  status: string;
  call_type: string | null;
  summary: string | null;
  cost: number | null;
  duration: number | null;
  createdAt: string;
}

interface Stats {
  total: number;
  byType: Record<string, number>;
  totalCost: number;
}

interface Agent {
  id: string;
  agentName: string;
  company: string | null;
  assistant_id: string | null;
  phoneNumberId: string | null;
}

const CALL_TYPE_LABELS: Record<string, string> = {
  incidencia: 'Incidencia',
  transferencia: 'Transferencia',
  factura: 'Factura',
  pregunta_servicio: 'Pregunta servicio',
  lead: 'Lead',
  otro: 'Otro',
};

const CALL_TYPE_COLORS: Record<string, string> = {
  incidencia: 'bg-red-900/40 text-red-300',
  transferencia: 'bg-blue-900/40 text-blue-300',
  factura: 'bg-yellow-900/40 text-yellow-300',
  pregunta_servicio: 'bg-purple-900/40 text-purple-300',
  lead: 'bg-green-900/40 text-green-300',
  otro: 'bg-slate-700 text-slate-300',
};

export default function DashboardPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [myNumbers, setMyNumbers] = useState<any[]>([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedSummary, setExpandedSummary] = useState<{ id: string; text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!expandedSummary) return;
    const handler = () => setExpandedSummary(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [expandedSummary]);

  const fetchData = async () => {
    try {
      const [dashRes, agentsRes, phonesRes] = await Promise.all([
        api.get(`/calls/dashboard/${agentId}`),
        api.get('/agents'),
        api.get('/phones'),
      ]);
      setCalls(dashRes.data.calls);
      setStats(dashRes.data.stats);
      const found = agentsRes.data.find((a: Agent) => a.id === agentId);
      setAgent(found || null);
      if (found?.phoneNumberId) setSelectedPhone(found.phoneNumberId);
      setMyNumbers(phonesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [agentId]);

  const handleAssignPhone = async (phoneNumberId: string) => {
    try {
      await api.put('/phones/assign', { phoneNumberId: phoneNumberId || null, agentId });
      setSelectedPhone(phoneNumberId);
      await fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al asignar número';
      alert(msg);
      setSelectedPhone(agent?.phoneNumberId || '');
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este agente y todo su historial de llamadas?')) return;
    setDeleting(true);
    try {
      await api.delete(`/agents/${agentId}`);
      await refreshUser();
      router.push('/');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar');
      setDeleting(false);
    }
  };

  const filteredCalls = filter === 'all' ? calls : calls.filter(c => c.call_type === filter);

  if (loading) return (
    <div className="min-h-screen">
      <ClientTabs />
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Cargando...</div>
      </div>
    </div>
  );

  return (
    <>
    <div className="min-h-screen">
      <ClientTabs />
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{agent?.agentName || 'Agente'}</h1>
            {agent?.company && <p className="text-slate-400">{agent.company}</p>}
            {agent?.assistant_id && (
              <p className="text-xs text-slate-500 mt-1">Vapi ID: {agent.assistant_id}</p>
            )}
          </div>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 bg-red-900/40 text-red-400 rounded-lg hover:bg-red-800/60 transition-colors text-sm disabled:opacity-50">
            {deleting ? 'Eliminando...' : 'Eliminar agente'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="premium-card p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
            <div className="text-slate-400 text-sm mt-1">Total llamadas</div>
          </div>
          {Object.entries(stats?.byType || {}).map(([type, count]) => (
            <div key={type} className="premium-card p-4 text-center">
              <div className="text-3xl font-bold text-white">{count}</div>
              <div className="text-slate-400 text-sm mt-1">{CALL_TYPE_LABELS[type] || type}</div>
            </div>
          ))}
          <div className="premium-card p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats?.totalCost?.toFixed(3) || '0.000'} €</div>
            <div className="text-slate-400 text-sm mt-1">Coste total</div>
          </div>
        </div>

        {/* Número asignado */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Número de teléfono asignado</h2>
          <div className="flex gap-3 items-center">
            <select
              value={selectedPhone}
              onChange={e => handleAssignPhone(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">Sin asignar</option>
              {myNumbers.map((n: any) => (
                <option key={n.id} value={n.id}>
                  {n.number}
                </option>
              ))}
            </select>
            {myNumbers.length === 0 && (
              <p className="text-slate-400 text-sm">No tienes números. Ve a <a href="/phones" className="text-blue-400 hover:underline">Mis Números</a> para reclamar uno.</p>
            )}
          </div>
        </div>

        {/* Multi-agente sidebar notice */}
        {(user?.agents?.length || 0) > 1 && (
          <div className="premium-card p-4 mb-8 border-blue-700/50 bg-blue-900/10">
            <p className="text-blue-400 text-sm font-medium">Tus agentes:</p>
            <div className="flex gap-2 flex-wrap mt-2">
              {user?.agents?.map(a => (
                <a key={a.id} href={`/dashboard/${a.id}`}
                  className={`px-3 py-1 rounded-full text-sm ${a.id === agentId ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {a.agentName}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Call history */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Historial de llamadas</h2>
            <div className="flex gap-2 flex-wrap">
              {['all', 'incidencia', 'transferencia', 'factura', 'pregunta_servicio', 'lead', 'otro'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                  {f === 'all' ? 'Todas' : CALL_TYPE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {filteredCalls.length === 0 ? (
            <p className="text-slate-400 text-center py-12">No hay llamadas registradas aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Teléfono</th>
                    <th className="text-left py-2 pr-4">Tipo</th>
                    <th className="text-left py-2 pr-4">Resumen</th>
                    <th className="text-left py-2 pr-4">Dur.</th>
                    <th className="text-left py-2 pr-4">Coste</th>
                    <th className="text-left py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map(call => (
                    <tr key={call.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-3 pr-4 text-white font-mono">{call.caller_phone || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${CALL_TYPE_COLORS[call.call_type || 'otro']}`}>
                          {CALL_TYPE_LABELS[call.call_type || 'otro'] || call.call_type || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-300 max-w-xs">
                        <span
                          className={`truncate block ${call.summary ? 'cursor-pointer hover:text-white' : ''}`}
                          onDoubleClick={e => {
                            e.stopPropagation();
                            if (!call.summary) return;
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const popupHeight = 200;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const y = spaceBelow < popupHeight ? rect.top - popupHeight - 6 : rect.bottom + 6;
                            setExpandedSummary({ id: call.id, text: call.summary, x: rect.left, y });
                          }}
                        >
                          {call.summary || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{call.duration ? `${call.duration}s` : '—'}</td>
                      <td className="py-3 pr-4 text-slate-400">{call.cost ? `${call.cost.toFixed(3)}€` : '—'}</td>
                      <td className="py-3 text-slate-500 text-xs">{new Date(call.createdAt).toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>

    {/* Popup flotante de resumen */}
    {expandedSummary && (
      <div
        className="fixed z-50 w-80 bg-[#1e293b] border border-slate-600 rounded-xl shadow-2xl p-4 text-sm text-slate-200 leading-relaxed"
        style={{ top: expandedSummary.y, left: Math.min(expandedSummary.x, window.innerWidth - 340) }}
        onClick={e => e.stopPropagation()}
      >
        {expandedSummary.text}
      </div>
    )}
    </>
  );
}
