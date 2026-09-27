export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'cognito' | 'google' | 'demo';
  role: 'driver' | 'fleet_manager' | 'vpp_operator';
  city: string;
  creditsBalance: number;
  /** Presente apenas para sessões reais do Cognito (login/signup), nunca no Modo Demo. */
  accessToken?: string;
  idToken?: string;
}
