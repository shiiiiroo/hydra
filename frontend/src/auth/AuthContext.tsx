import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Role, User } from '../types';
import { tokenStore } from '../api/client';
import { fetchMe, login as apiLogin, logout as apiLogout } from '../api/resources';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  refreshUser: () => Promise<void>;
}

const ROLE_LEVEL: Record<Role, number> = { viewer: 0, inspector: 1, admin: 2 };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    const onExpired = () => {
      tokenStore.clear();
      setUser(null);
    };
    window.addEventListener('hm:auth-expired', onExpired);
    return () => window.removeEventListener('hm:auth-expired', onExpired);
  }, [loadUser]);

  const login = useCallback(async (username: string, password: string) => {
    await apiLogin(username, password);
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => {
    if (!user) return false;
    const min = Math.min(...roles.map((r) => ROLE_LEVEL[r]));
    return ROLE_LEVEL[user.role] >= min;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
