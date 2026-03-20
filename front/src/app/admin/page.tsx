'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { FiUsers, FiPlus, FiChevronRight, FiLogOut, FiPhone, FiTrash2, FiCheckCircle } from 'react-icons/fi';

interface UserData {
  id: string;
  email: string;
  role: string;
  maxAssistants: number;
  maxPhoneNumbers: number;
  agents: any[];
  phoneNumbers: any[];
}

interface PoolNumber {
  id: string;
  number: string;
  sipDomain: string | null;
  sipUser: string | null;
  vapiPhoneNumberId: string | null;
  userId: string | null;
  user?: { email: string } | null;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [poolNumbers, setPoolNumbers] = useState<PoolNumber[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);

  // Form: nuevo usuario
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLimit, setNewLimit] = useState(1);

  // Form: nuevo número
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sipDomain, setSipDomain] = useState('');
  const [sipUser, setSipUser] = useState('');
  const [sipPassword, setSipPassword] = useState('');
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPool = async () => {
    try {
      const { data } = await api.get('/admin/phones');
      setPoolNumbers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPool(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers();
      fetchPool();
    }
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', { email: newEmail, password: newPassword, maxAssistants: newLimit, role: 'USER' });
      setShowCreate(false);
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      alert('Error creando usuario');
    }
  };

  const handleAddPhone = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    try {
      await api.post('/admin/phones', { number: phoneNumber, sipDomain, sipUser, sipPassword, force });
      setShowAddPhone(false);
      setPhoneNumber('');
      setSipDomain('');
      setSipUser('');
      setSipPassword('');
      fetchPool();
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409 && data?.vapiExists) {
        const confirmed = confirm(
          `⚠️ ${data.error}\n\nSi confirmas, se vinculará el número existente en Vapi a este pool sin crear uno nuevo.`
        );
        if (confirmed) {
          await handleAddPhone(e, true);
        }
      } else {
        alert('Error: ' + (data?.error || err.message));
      }
    }
  };

  const handleDeletePhone = async (id: string, number: string) => {
    if (!confirm(`¿Eliminar el número ${number} del pool? Se eliminará también de Vapi si estaba registrado.`)) return;
    setDeletingPhone(id);
    try {
      await api.delete(`/admin/phones/${id}`);
      fetchPool();
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingPhone(null);
    }
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Panel de Administración
          </h1>
          <p className="text-gray-400 mt-1">Gestiona los clientes y el pool de números</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
          <FiLogOut /> Cerrar Sesión
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">

        {/* ── Clientes ── */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FiUsers className="text-blue-400" /> Clientes Activos
            </h2>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
              <FiPlus /> {showCreate ? 'Cancelar' : 'Nuevo Cliente'}
            </button>
          </div>

          {showCreate && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-medium mb-4">Añadir Nuevo Cliente</h3>
              <form onSubmit={handleCreateUser} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
                    placeholder="cliente@empresa.com" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
                  <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-blue-500 outline-none"
                    placeholder="••••••••" />
                </div>
                <div className="w-32">
                  <label className="block text-sm text-gray-400 mb-1">Límite Asist.</label>
                  <input type="number" min="1" required value={newLimit} onChange={e => setNewLimit(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-blue-500 outline-none" />
                </div>
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors h-[42px]">
                  Crear
                </button>
              </form>
            </div>
          )}

          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="p-4 text-gray-400 font-medium">Usuario / Email</th>
                  <th className="p-4 text-gray-400 font-medium">Agentes</th>
                  <th className="p-4 text-gray-400 font-medium">Teléfonos</th>
                  <th className="p-4 text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Cargando...</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)} className="hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <td className="p-4 font-medium">{u.email}</td>
                    <td className="p-4 text-blue-400">{u.agents?.length || 0} / {u.maxAssistants} MAX</td>
                    <td className="p-4 font-mono text-purple-400">{u.phoneNumbers?.length || 0} / {u.maxPhoneNumbers || 1} MAX</td>
                    <td className="p-4"><FiChevronRight className="text-slate-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && users.length === 0 && (
              <div className="p-8 text-center text-gray-500">No hay clientes registrados en la plataforma.</div>
            )}
          </div>
        </section>

        {/* ── Pool de números ── */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FiPhone className="text-purple-400" /> Pool de Números
            </h2>
            <button onClick={() => setShowAddPhone(!showAddPhone)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors">
              <FiPlus /> {showAddPhone ? 'Cancelar' : 'Añadir Número'}
            </button>
          </div>

          {showAddPhone && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-medium mb-4">Añadir Número al Pool</h3>
              <form onSubmit={handleAddPhone} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Número de teléfono</label>
                  <input type="text" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                    placeholder="+34912345678" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Dominio SIP</label>
                  <input type="text" value={sipDomain} onChange={e => setSipDomain(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                    placeholder="ix1.neotel2000.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Usuario SIP</label>
                  <input type="text" value={sipUser} onChange={e => setSipUser(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                    placeholder="4779-405" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Contraseña SIP</label>
                  <input type="text" value={sipPassword} onChange={e => setSipPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-purple-500 outline-none"
                    placeholder="••••••••" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors">
                    Añadir al Pool
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="p-4 text-gray-400 font-medium">Número</th>
                  <th className="p-4 text-gray-400 font-medium">Dominio SIP</th>
                  <th className="p-4 text-gray-400 font-medium">Estado Vapi</th>
                  <th className="p-4 text-gray-400 font-medium">Asignado a</th>
                  <th className="p-4 text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingPool ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Cargando...</td></tr>
                ) : poolNumbers.map(n => (
                  <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono text-white">{n.number}</td>
                    <td className="p-4 text-sm text-slate-400">{n.sipDomain || '—'}</td>
                    <td className="p-4">
                      {n.vapiPhoneNumberId ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                          <FiCheckCircle size={13} /> Registrado
                        </span>
                      ) : (
                        <span className="text-amber-400 text-sm">Pendiente</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {n.user?.email || <span className="text-slate-600">Libre</span>}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDeletePhone(n.id, n.number)}
                        disabled={deletingPhone === n.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-500/20 disabled:opacity-40 transition-colors"
                      >
                        <FiTrash2 size={13} /> {deletingPhone === n.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loadingPool && poolNumbers.length === 0 && (
              <div className="p-8 text-center text-gray-500">No hay números en el pool.</div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
