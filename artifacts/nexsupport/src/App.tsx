import "@/lib/i18n";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';

// Import pages
import { ExecutiveDashboard } from '@/pages/executive-dashboard';
import { TechnicalDashboard } from '@/pages/technical-dashboard';
import { DevicesList } from '@/pages/devices/index';
import { DeviceDetail } from '@/pages/devices/detail';
import { TicketsList } from '@/pages/tickets/index';
import { TicketDetail } from '@/pages/tickets/detail';
import { Alerts } from '@/pages/alerts';
import { AiAssistant } from '@/pages/ai-assistant';
import { ScriptsLibrary } from '@/pages/scripts';
import { Automations } from '@/pages/automations';
import { Settings } from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={ExecutiveDashboard} />
        <Route path="/technical" component={TechnicalDashboard} />
        <Route path="/devices" component={DevicesList} />
        <Route path="/devices/:id" component={DeviceDetail} />
        <Route path="/tickets" component={TicketsList} />
        <Route path="/tickets/:id" component={TicketDetail} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/ai" component={AiAssistant} />
        <Route path="/scripts" component={ScriptsLibrary} />
        <Route path="/automations" component={Automations} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
