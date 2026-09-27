import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '@/types/auth';
import {
  cognitoInitiateAuth,
  cognitoSignUp,
  getGoogleOAuthUrl,
  parseJwt,
} from '@/lib/cognito';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => void;
  demoLogin: (role?: 'driver' | 'fleet_manager') => void;
  setSessionUser: (user: UserProfile) => void;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
}

const STORAGE_KEY = 'rioflex_auth_session';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => false,
  signup: async () => false,
  loginWithGoogle: () => {},
  demoLogin: () => {},
  setSessionUser: () => {},
  logout: () => {},
  updateProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicialmente NULO a menos que já exista uma sessão salva pelo usuário
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to sync auth to localStorage:', err);
    }
  }, [user]);

  const login = async (email: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. Autenticação Real no Amazon Cognito User Pool
      const authResult = await cognitoInitiateAuth(email, password);
      const idToken = authResult.AuthenticationResult?.IdToken;
      const accessToken = authResult.AuthenticationResult?.AccessToken;

      let name = email.split('@')[0].replace('.', ' ');
      let sub = `usr_${Date.now()}`;

      if (idToken) {
        const payload = parseJwt(idToken);
        if (payload.name) name = payload.name;
        if (payload.sub) sub = payload.sub;
      }

      const loggedUser: UserProfile = {
        id: sub,
        name,
        email,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        provider: 'cognito',
        role: 'driver',
        city: 'Rio de Janeiro, RJ',
        creditsBalance: 42.50,
        accessToken,
        idToken,
      };

      setUser(loggedUser);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setIsLoading(false);
      // Re-throw para o formulário exibir a mensagem amigável
      throw err;
    }
  };

  const signup = async (name: string, email: string, password = ''): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 1. Cadastro Real no Amazon Cognito User Pool
      await cognitoSignUp(email, password, name);

      // Usuário criado com sucesso
      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        name: name || 'Novo Condutor',
        email,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        provider: 'cognito',
        role: 'driver',
        city: 'Rio de Janeiro, RJ',
        creditsBalance: 15.00, // Bônus de boas-vindas
      };

      setUser(newUser);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  const loginWithGoogle = () => {
    // Redireciona diretamente para o fluxo oficial do Google via Cognito Hosted UI
    const redirectUri = `${window.location.origin}/auth/callback`;
    const googleOAuthUrl = getGoogleOAuthUrl(redirectUri);
    window.location.href = googleOAuthUrl;
  };

  const demoLogin = (role: 'driver' | 'fleet_manager' = 'driver') => {
    const demo: UserProfile = {
      id: 'usr_demo_rio_flex',
      name: role === 'driver' ? 'Marcos Silva (Condutor EV)' : 'Operador Frota COPPE',
      email: role === 'driver' ? 'marcos@rioflex.app' : 'frota.coppe@ufrj.br',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      provider: 'demo',
      role,
      city: 'Rio de Janeiro, RJ',
      creditsBalance: 42.50,
    };
    setUser(demo);
  };

  const setSessionUser = (profile: UserProfile) => {
    setUser(profile);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        loginWithGoogle,
        demoLogin,
        setSessionUser,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
