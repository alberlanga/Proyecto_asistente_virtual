'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ClientTabs from '@/components/ClientTabs';

export default function PhonesPage() {
  const { user, refreshUser } = useAuth();
  const [myNumbers, setMyNumbers] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);

  const fetchData = async () => {
    const [myRes, availRes] = await Promise.all([
      api.get('/phones'),
      api.get('/phones/available'),
    ]);
    setMyNumbers(myRes.data);
    setAvailable(availRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleClaim = async (phoneNumberId: string) => {
    setClaiming(phoneNumberId);
    try {
      await api.post('/phones/claim', { phoneNumberId });
      await fetchData();
      await refreshUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al reclamar número');
    } finally {
      setClaiming(null);
    }
  };

  const handleRelease = async (id: string) => {
    if (!confirm('¿Liberar este número y devolverlo al pool?')) return;
    setReleasing(id);
    try {
      await api.delete(`/phones/${id}`);
      await fetchData();
      await refreshUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al liberar número');
    } finally {
      setReleasing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen">
      <ClientTabs />
      <div className="flex justify-center items-center h-64"><div className="text-slate-400">Cargando...</div></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <ClientTabs />
      <main className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Mis Números de Teléfono</h1>
          <p className="text-slate-400 mt-1">Gestiona los números asignados a tu cuenta ({myNumbers.length}/{user?.maxAssistants || 1} usado(s)).</p>
        </div>

        {/* Mis números */}
        <div className="premium-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Números asignados a ti</h2>
          {myNumbers.length === 0 ? (
            <p className="text-slate-400 text-sm">No tienes números asignados. Reclama uno del pool disponible.</p>
          ) : (
            <div className="space-y-3">
              {myNumbers.map((n: any) => (
                <div key={n.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-mono font-medium">{n.number}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {n.agents?.length > 0 ? n.agents.map((a: any) => (
                        <span key={a.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400">
                          {a.agentName}
                        </span>
                      )) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Sin asignar</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRelease(n.id)}
                    disabled={releasing === n.id}
                    className="px-3 py-1.5 text-sm bg-red-900/40 text-red-400 rounded-lg hover:bg-red-800/60 transition-colors disabled:opacity-50"
                  >
                    {releasing === n.id ? 'Liberando...' : 'Liberar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pool disponible */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Números disponibles en el pool</h2>
          {available.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay números disponibles en este momento. Contacta al administrador.</p>
          ) : (
            <div className="space-y-3">
              {available.map((n: any) => (
                <div key={n.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-mono font-medium">{n.number}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${n.vapiPhoneNumberId ? 'bg-green-900/40 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                      {n.vapiPhoneNumberId ? 'Vapi ✓' : 'Pendiente de registro'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleClaim(n.id)}
                    disabled={claiming === n.id}
                    className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
                  >
                    {claiming === n.id ? 'Reclamando...' : 'Reclamar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
