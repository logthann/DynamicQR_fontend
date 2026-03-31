/**
 * Integration dashboard wiring calendar browse/import/sync flows.
 */

'use client';

import { useState } from 'react';
import CalendarSyncActions from '@/modules/campaigns/calendar-sync/calendar-sync-actions';
import CalendarEventsList from '@/modules/integrations/calendar/events/calendar-events-list';
import IntegrationConnectPanel from '@/modules/integrations/connect/integration-connect-panel';
import ImportCampaignsAction from '@/modules/integrations/calendar/import/import-campaigns-action';
import IntegrationStatusPanel from '@/modules/integrations/status/integration-status-panel';

export default function IntegrationsDashboard() {
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Google Calendar Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse events, import campaigns, and sync/unlink campaign calendar mappings.
        </p>
      </div>

      <IntegrationStatusPanel />

      <IntegrationConnectPanel />

      <CalendarEventsList
        selectedEventIds={selectedEventIds}
        onSelectionChange={setSelectedEventIds}
      />

      <ImportCampaignsAction selectedEventIds={selectedEventIds} />

      <CalendarSyncActions />
    </section>
  );
}

