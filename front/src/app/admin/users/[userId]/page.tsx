'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchUser = async () => {
    const { data } = await api.get(`/admin/users/${userId}`);
    setUser(data);
    setLoading(false);
  };

  useEffect(() => { fetchUser(); }, [userId]);

  const updateLimit = async (field: 'maxAssistants' | 'maxPhoneNumbers', delta: number) => {
    const current = user[field];
    const next = Math.max(0, current + delta);
    setUpdating(true);
    try {
      await api.put(`/admin/users/${userId}/limit`, { [field]: next });
      await fetchUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">Cargando...</div>
    </div>
  );

  const allCalls = user.agents?.flatMap((a: any) => a.calls || []) || [];
  const totalCost = allCalls.reduce((acc: number, c: any) => acc + (c.cost || 0), 0);

  const CALL_TYPE_LABELS: Record<string, string> = {
    incidencia: 'Incidencia', transferencia: 'Transferencia',
    factura: 'Factura', pregunta_servicio: 'Pregunta', lead: 'Lead', otro: 'Otro',
  };

  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-3 px-6 py-4 border-b border-slate-700 mb-8">
        <button onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Admin
        </button>
        <span className="text-slate-600">/</span>
        <span className="text-white font-medium">{user.email}</span>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pb-12 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Agentes', value: `${user.agents?.length || 0}/${user.maxAssistants}` },
            { label: 'Teléfonos', value: `${user.phoneNumbers?.length || 0}/${user.maxPhoneNumbers}` },
            { label: 'Total llamadas', value: allCalls.length },
            { label: 'Coste total', value: `${totalCost.toFixed(3)}€` },
          ].map(s => (
            <div key={s.label} className="premium-card p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Limits */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Límites del usuario</h2>
          <div className="flex gap-8">
            {(['maxAssistants', 'maxPhoneNumbers'] as const).map(field => (
              <div key={field} className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">{field === 'maxAssistants' ? 'Máx. agentes' : 'Máx. teléfonos'}</span>
                <button onClick={() => updateLimit(field, -1)} disabled={updating}
                  className="w-8 h-8 bg-slate-700 rounded-full text-white hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center font-bold">−</button>
                <span className="text-white font-bold text-xl w-8 text-center">{user[field]}</span>
                <button onClick={() => updateLimit(field, 1)} disabled={updating}
                  className="w-8 h-8 bg-blue-700 rounded-full text-white hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center font-bold">+</button>
              </div>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Agentes ({user.agents?.length || 0})</h2>
          {(user.agents?.length || 0) === 0 ? (
            <p className="text-slate-400 text-sm">Sin agentes.</p>
          ) : (
            <div className="space-y-4">
              {user.agents?.map((a: any) => (
                <div key={a.id} className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{a.agentName}</p>
                      {a.company && <p className="text-slate-400 text-sm">{a.company}</p>}
                      {a.phoneNumber && <p className="text-slate-500 text-xs font-mono">{a.phoneNumber.number}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">{a.calls?.length || 0} llamadas</p>
                      <p className="text-slate-500 text-xs">
                        {a.calls?.reduce((acc: number, c: any) => acc + (c.cost || 0), 0).toFixed(3)}€
                      </p>
                    </div>
                  </div>
                  {(a.calls?.length || 0) > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {Object.entries(
                        a.calls.reduce((acc: Record<string, number>, c: any) => {
                          const t = c.call_type || 'otro';
                          acc[t] = (acc[t] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([type, count]) => (
                        <span key={type} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                          {CALL_TYPE_LABELS[type] || type}: {count as number}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phone numbers */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Teléfonos ({user.phoneNumbers?.length || 0})</h2>
          {(user.phoneNumbers?.length || 0) === 0 ? (
            <p className="text-slate-400 text-sm">Sin teléfonos asignados.</p>
          ) : (
            <div className="space-y-2">
              {user.phoneNumbers?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-white font-mono text-sm">{p.number}</p>
                  {p.agents?.length > 0 && (
                    <span className="text-xs text-blue-400">{p.agents.map((a: any) => a.agentName).join(', ')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call history */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de llamadas ({allCalls.length})</h2>
          {allCalls.length === 0 ? (
            <p className="text-slate-400 text-sm">Sin llamadas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-3">Teléfono</th>
                    <th className="text-left py-2 pr-3">Tipo</th>
                    <th className="text-left py-2 pr-3">Estado</th>
                    <th className="text-left py-2 pr-3">Coste</th>
                    <th className="text-left py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {allCalls.map((c: any) => (
                    <tr key={c.id} className="border-b border-slate-800">
                      <td className="py-2 pr-3 text-white font-mono">{c.caller_phone || '—'}</td>
                      <td className="py-2 pr-3 text-slate-300">{CALL_TYPE_LABELS[c.call_type] || c.call_type || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-400">{c.cost ? `${c.cost.toFixed(3)}€` : '—'}</td>
                      <td className="py-2 text-slate-500 text-xs">{new Date(c.createdAt).toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
