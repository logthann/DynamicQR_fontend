/**
 * Integrations Page
 * Protected route: /integrations
 */

import IntegrationsDashboard from '@/modules/integrations/calendar/integrations-dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Integrations | Dynamic QR',
  description: 'Browse and sync Google Calendar integrations',
};

export default function IntegrationsPage() {
  return <IntegrationsDashboard />;
}

