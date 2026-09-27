import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage({ signup = false }: { signup?: boolean }) {
  const [, setLocation] = useLocation();
  const { login, signup: doSignup, loginWithGoogle, demoLogin, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (signup) {
        const ok = await doSignup(name || 'Condutor Rio-Flex', email, password);
        if (ok) setLocation('/app');
      } else {
        const ok = await login(email, password);
        if (ok) setLocation('/app');
      }
    } catch (err: any) {
      console.warn('[Cognito Auth Error]:', err);
      setErrorMsg(err.message || 'Erro ao conectar ao Amazon Cognito. Verifique suas credenciais ou use o Modo Demo.');
    }
  };

  const handleGoogle = () => {
    loginWithGoogle();
  };

  const handleDemo = (role: 'driver' | 'fleet_manager') => {
    // "Gestor de Frota" não é um papel do Cognito (que só cobre o portal do condutor) — o portal
    // de gestão de verdade tem login e sessão próprios, em /gestor/login. Antes, esse botão fazia
    // um demoLogin no Cognito e mandava pra /app mesmo assim, sem nunca abrir o painel do gestor.
    if (role === 'fleet_manager') {
      setLocation('/gestor/login');
      return;
    }
    demoLogin(role);
    setLocation('/app');
  };

  return (
    <div className="rf-auth">
      <div className="rf-auth-side">
        <Brand light />
        <div>
          <h1>Uma decisão melhor começa <em>antes</em> da tomada.</h1>
          <p>
            O Rio Flex conecta sua recarga ao excedente solar do Rio, gerando créditos automáticos e protegendo a rede elétrica da cidade.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4ae3a5', fontSize: 13, fontWeight: 600 }}>
            <ShieldCheck size={16} /> Identidade Segura via AWS Cognito
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
            <CheckCircle2 size={14} color="#38bdf8" /> Integração com Google Identity & OAuth 2.0
          </div>
          <div className="rf-eyebrow" style={{ marginTop: 12 }}>
            Mobilidade Elétrica Inteligente • Hackathon COPPE / UFRJ
          </div>
        </div>
      </div>

      <div className="rf-auth-form">
        <div className="rf-auth-box">
          <Link href="/" className="rf-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            <ArrowLeft size={13} /> voltar ao início
          </Link>
          <div className="rf-portal-switch" role="tablist" aria-label="Escolha o portal">
            <Link href="/login" className="active">Sou motorista</Link>
            <Link href="/gestor/login">Sou gestor</Link>
          </div>
          <h2>{signup ? 'Cadastre seu veículo' : 'Bem-vindo ao Rio Flex'}</h2>
          <p>{signup ? 'Leva menos de 1 minuto para começar a economizar.' : 'Acesse seus postos com desconto e sua carteira de créditos.'}</p>

          {/* Botão de Login com Google Oficial */}
          <button
            type="button"
            className="rf-btn secondary full"
            onClick={handleGoogle}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#ffffff',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isLoading ? 'Autenticando...' : 'Continuar com o Google'}</span>
          </button>

          <div style={{ textAlign: 'center', margin: '18px 0', color: '#64748b', fontSize: 12, position: 'relative' }}>
            <span style={{ background: '#0b0e11', padding: '0 10px', position: 'relative', zIndex: 1 }}>ou com e-mail e senha</span>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#1e293b', zIndex: 0 }} />
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.4,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <b>Atenção:</b> {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {signup && (
              <div style={{ marginBottom: 12 }}>
                <label className="rf-label" htmlFor="name">Seu Nome Completo</label>
                <input
                  id="name"
                  className="rf-input"
                  required
                  placeholder="Marcos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label className="rf-label" htmlFor="email">E-mail Corporativo ou Pessoal</label>
              <input
                id="email"
                className="rf-input"
                required
                placeholder="seu.email@exemplo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="rf-label" htmlFor="password">Senha (mínimo 8 dígitos)</label>
              <input
                id="password"
                className="rf-input"
                required
                minLength={8}
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="full" disabled={isLoading} style={{ marginTop: 4 }}>
              {isLoading
                ? 'Conectando ao Cognito...'
                : signup
                ? 'Criar Conta e Explorar Mapa'
                : 'Entrar com E-mail'}{' '}
              <ArrowRight size={15} />
            </Button>
          </form>

          {/* Atalhos Rápidos para Demonstração de Vídeo */}
          <div
            style={{
              marginTop: 20,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(74, 227, 165, 0.05)',
              border: '1px dashed rgba(74, 227, 165, 0.25)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4ae3a5', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={13} /> Demonstração Rápida (1-Clique):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="rf-btn secondary small"
                onClick={() => handleDemo('driver')}
                style={{ fontSize: 11, padding: '6px 8px', textAlign: 'center' }}
              >
                Condutor EV
              </button>
              <button
                type="button"
                className="rf-btn secondary small"
                onClick={() => handleDemo('fleet_manager')}
                style={{ fontSize: 11, padding: '6px 8px', textAlign: 'center' }}
              >
                Gestor de Frota
              </button>
            </div>
          </div>

          <div className="rf-auth-switch" style={{ marginTop: 16 }}>
            {signup ? 'Já tem uma conta cadastrada?' : 'Ainda não possui conta?'}{' '}
            <Link href={signup ? '/login' : '/signup'}>{signup ? 'Faça login' : 'Cadastre-se'}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

