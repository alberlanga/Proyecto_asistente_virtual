'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ClientTabs() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const hasAgent = user?.agents && user.agents.length > 0;
  const firstAgentId = user?.agents?.[0]?.id;

  const tabs = [
    { label: 'Crear Agente', href: '/', active: pathname === '/' },
    { label: 'Dashboard', href: hasAgent ? `/dashboard/${firstAgentId}` : '#', active: pathname.startsWith('/dashboard'), disabled: !hasAgent },
    { label: 'Mis Números', href: '/phones', active: pathname === '/phones' },
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-700 mb-8">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Recepción IA
        </span>
      </div>
      <div className="flex gap-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.disabled ? '#' : tab.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab.active
                ? 'bg-blue-600 text-white'
                : tab.disabled
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            onClick={e => tab.disabled && e.preventDefault()}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{user?.email}</span>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-red-400 transition-colors">
          Salir
        </button>
      </div>
    </nav>
  );
}
