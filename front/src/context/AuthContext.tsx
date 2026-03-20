'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  maxAssistants: number;
  agents?: { id: string; agentName: string; phoneNumberId: string | null }[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true,
  login: () => {}, logout: () => {}, refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUser(); }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push(user.role === 'ADMIN' ? '/admin' : '/');
      } else if (user?.role !== 'ADMIN' && pathname.startsWith('/admin')) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = (_token: string, userData: User) => {
    setUser(userData);
    router.push(userData.role === 'ADMIN' ? '/admin' : '/');
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
