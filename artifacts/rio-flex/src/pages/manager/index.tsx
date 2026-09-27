import type { ComponentType } from 'react';
import { Route, Switch } from 'wouter';
import { ManagerAuthProvider } from '@/context/ManagerAuthContext';
import { RequireManagerAuth } from '@/components/manager/ui';
import ManagerLoginPage from './Login';
import ManagerOverviewPage from './Overview';
import ManagerGridPage from './Grid';
import ManagerSignalsPage from './Signals';
import FlexiaPage from './Flexia';
import RegulationPage from './Regulation';
import AlertsPage from './Alerts';
import ReportsPage from './Reports';
import WallPage from './Telao';
import CyclePage from './Cycle';

const guarded = (Page: ComponentType) => () => <RequireManagerAuth><Page /></RequireManagerAuth>;

/**
 * Portal do gestor de frota, montado como sub-app sob /gestor/*. Fica isolado do restante do
 * roteador: tem sua própria sessão (ManagerAuthProvider, backend flexrioTest/FlexRioApiServer),
 * completamente à parte do Cognito usado pelo portal do condutor em /app/*.
 */
export default function ManagerApp() {
  return (
    <ManagerAuthProvider>
      <Switch>
        <Route path="/gestor/login" component={ManagerLoginPage} />
        <Route path="/gestor" component={guarded(ManagerOverviewPage)} />
        <Route path="/gestor/rede" component={guarded(ManagerGridPage)} />
        <Route path="/gestor/sinais" component={guarded(ManagerSignalsPage)} />
        <Route path="/gestor/flexia" component={guarded(FlexiaPage)} />
        <Route path="/gestor/regulacao" component={guarded(RegulationPage)} />
        <Route path="/gestor/alertas" component={guarded(AlertsPage)} />
        <Route path="/gestor/ciclo" component={guarded(CyclePage)} />
        <Route path="/gestor/relatorios" component={guarded(ReportsPage)} />
        <Route path="/gestor/telao" component={guarded(WallPage)} />
      </Switch>
    </ManagerAuthProvider>
  );
}
