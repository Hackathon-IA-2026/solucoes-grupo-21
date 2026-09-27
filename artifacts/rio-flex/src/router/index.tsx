import { Route, Switch, Redirect } from 'wouter';
import LandingPage from '@/pages/landing';
import AuthPage from '@/pages/auth';
import CallbackPage from '@/pages/auth/CallbackPage';
import OnboardingPage from '@/pages/onboarding';
import HomePage from '@/pages/home';
import MapPage from '@/pages/map';
import SessionPage from '@/pages/session';
import ReceiptPage from '@/pages/receipt';
import WalletPage from '@/pages/wallet';
import ProfilePage from '@/pages/profile';
import NotFound from '@/pages/not-found';
import ManagerApp from '@/pages/manager';
import { useAuth } from '@/context/AuthContext';

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080d12', color: '#4ae3a5' }}>
        <span>Carregando sessão...</span>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Redirect to="/login" replace />;
  }
  return <>{children}</>;
}

function UnprotectedOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) {
    return <Redirect to="/app" replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Switch>
      {/* Autenticação & Onboarding */}
      <Route path="/" component={LandingPage} />
      <Route path="/login">{() => <UnprotectedOnly><AuthPage /></UnprotectedOnly>}</Route>
      <Route path="/signup">{() => <UnprotectedOnly><AuthPage signup /></UnprotectedOnly>}</Route>
      <Route path="/auth/callback" component={CallbackPage} />
      <Route path="/onboarding" component={OnboardingPage} />

      {/* 5 Telas Principais da Jornada do Usuário (Protegidas por Cognito/Auth) */}
      <Route path="/app">{() => <Protected><HomePage /></Protected>}</Route>
      <Route path="/app/home">{() => <Protected><HomePage /></Protected>}</Route>
      <Route path="/app/map">{() => <Protected><MapPage /></Protected>}</Route>
      <Route path="/app/session">{() => <Protected><SessionPage /></Protected>}</Route>
      <Route path="/app/receipt">{() => <Protected><ReceiptPage /></Protected>}</Route>
      <Route path="/app/wallet">{() => <Protected><WalletPage /></Protected>}</Route>
      <Route path="/app/profile">{() => <Protected><ProfilePage /></Protected>}</Route>

      {/* Redirecionamentos amigáveis protegidos */}
      <Route path="/app/rewards">{() => <Protected><WalletPage /></Protected>}</Route>
      <Route path="/app/history">{() => <Protected><WalletPage /></Protected>}</Route>
      <Route path="/app/monitoring">{() => <Protected><WalletPage /></Protected>}</Route>
      <Route path="/app/planner">{() => <Protected><MapPage /></Protected>}</Route>

      {/* Portal do gestor de frota: sub-app isolado, sessão própria (não usa Cognito) */}
      {/* "/gestor/:rest*" não casa com "/gestor" puro (destino do login): rota explícita. */}
      <Route path="/gestor" component={ManagerApp} />
      <Route path="/gestor/:rest*" component={ManagerApp} />

      {/* Fallback 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

