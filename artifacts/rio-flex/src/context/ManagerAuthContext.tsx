import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { managerApi, ManagerApiError } from '@/lib/manager-api';
import type { ManagerUser } from '@/types/manager';

/**
 * Sessão do portal do gestor: completamente separada do AuthContext do consumidor (que usa
 * Cognito). O backend de gestão (flexrioTest/FlexRioApiServer) tem seu próprio sistema de
 * login/sessão (cookie httpOnly cross-origin), sem relação com o User Pool do Cognito.
 */
type ManagerAuthState = {
  user: ManagerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ManagerUser>;
  logout: () => Promise<void>;
};

const ManagerAuthContext = createContext<ManagerAuthState | null>(null);

export function ManagerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ManagerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    managerApi
      .get<{ user: ManagerUser }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch((err) => {
        if (!(err instanceof ManagerApiError) || err.status !== 401) console.warn(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await managerApi.post<{ user: ManagerUser }>('/auth/login', { email, password, portal: 'manager' });
      queryClient.clear();
      setUser(r.user);
      return r.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await managerApi.post('/auth/logout').catch(() => undefined);
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  return <ManagerAuthContext.Provider value={{ user, loading, login, logout }}>{children}</ManagerAuthContext.Provider>;
}

export function useManagerAuth(): ManagerAuthState {
  const ctx = useContext(ManagerAuthContext);
  if (!ctx) throw new Error('useManagerAuth fora do ManagerAuthProvider');
  return ctx;
}
