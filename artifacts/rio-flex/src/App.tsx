import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { PwaProvider } from '@/context/PwaContext';
import { PwaInstallModal } from '@/components/pwa/PwaInstallModal';
import { AppRouter } from '@/router';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PwaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </WouterRouter>
          <PwaInstallModal />
        </PwaProvider>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;