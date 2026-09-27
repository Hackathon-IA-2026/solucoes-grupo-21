import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { exchangeCodeForTokens, parseJwt } from '@/lib/cognito';
import { Brand } from '@/components/common/Brand';
import { Loader2 } from 'lucide-react';

export default function CallbackPage() {
  const [, setLocation] = useLocation();
  const { setSessionUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errParam = urlParams.get('error_description') || urlParams.get('error');

        if (errParam) {
          throw new Error(errParam);
        }

        if (!code) {
          setLocation('/login');
          return;
        }

        const redirectUri = `${window.location.origin}/auth/callback`;
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        if (tokens.id_token) {
          const payload = parseJwt(tokens.id_token);
          const email = payload.email || 'condutor@rioflex.app';
          const name = payload.name || payload.given_name || email.split('@')[0];
          const avatarUrl = payload.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

          setSessionUser({
            id: payload.sub || `usr_${Date.now()}`,
            name,
            email,
            avatarUrl,
            provider: payload['identities']?.[0]?.providerName?.toLowerCase() === 'google' ? 'google' : 'cognito',
            role: 'driver',
            city: 'Rio de Janeiro, RJ',
            creditsBalance: 50.00,
            accessToken: tokens.access_token,
            idToken: tokens.id_token,
          });

          setLocation('/app');
        } else {
          throw new Error('Nenhum id_token retornado pelo Cognito.');
        }
      } catch (err: any) {
        console.error('[Auth Callback Error]:', err);
        setError(err.message || 'Falha ao autenticar.');
        setTimeout(() => setLocation('/login'), 2500);
      }
    }

    handleCallback();
  }, [setLocation, setSessionUser]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080d12',
        color: '#f8fafc',
        gap: 16,
        padding: 20,
      }}
    >
      <Brand light />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Loader2 className="animate-spin" size={24} color="#4ae3a5" />
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          {error ? `Erro: ${error}. Redirecionando...` : 'Autenticando via Amazon Cognito & Google...'}
        </span>
      </div>
    </div>
  );
}
