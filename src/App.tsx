import { ErrorBoundary, setupGlobalErrorHandling } from './components/ErrorBoundary';
import { AppProviders } from './providers/AppProviders';
import { RoutesIndex } from './routes';
import { NavigationProgress } from './components/ui/NavigationProgress';
import { OfflineBanner } from './components/OfflineBanner';
import { RouteTitle } from './components/RouteTitle';
import { Curtain } from './components/Curtain';

setupGlobalErrorHandling();

export function App() {
  return (
    <ErrorBoundary showDetails={import.meta.env.DEV} recoveryStrategy="refresh">
      <AppProviders>
        <Curtain />
        <RouteTitle />
        <OfflineBanner />
        <NavigationProgress />
        <RoutesIndex />
      </AppProviders>
    </ErrorBoundary>
  );
}
