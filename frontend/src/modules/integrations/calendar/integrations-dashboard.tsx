/**
 * Integration dashboard wiring calendar browse/import/sync flows.
 */

'use client';

import { useState } from 'react';
import CalendarEventsList from '@/modules/integrations/calendar/events/calendar-events-list';
import IntegrationConnectPanel from '@/modules/integrations/connect/integration-connect-panel';
import ImportCampaignsAction from '@/modules/integrations/calendar/import/import-campaigns-action';
import IntegrationStatusPanel from '@/modules/integrations/status/integration-status-panel';
import { useIntegrationContext } from '@/state/integration-context';
import DashboardIntegrationActions from '@/modules/integrations/calendar/dashboard-integration-actions';

export default function IntegrationsDashboard() {
  const { isGoogleConnected, connectedProviderLabel } = useIntegrationContext();
  const [mode, setMode] = useState<'none' | 'sync' | 'import' | 'remove'>('none');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [calendarQuery, setCalendarQuery] = useState<{
    rangeType: 'month' | 'year';
    year: number;
    month?: number;
    fromMonth?: number;
    toMonth?: number;
  }>({
    rangeType: 'month',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Google Calendar Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage provider connection, then import events into campaigns.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{connectedProviderLabel}</p>
      </div>

      <IntegrationStatusPanel />
      {!isGoogleConnected && <IntegrationConnectPanel />}

      <DashboardIntegrationActions mode={mode} onModeChange={setMode} />

      {isGoogleConnected && mode === 'import' && (
        <>
          <CalendarEventsList
            selectedEventIds={selectedEventIds}
            onSelectionChange={setSelectedEventIds}
            calendarQuery={calendarQuery}
            onCalendarQueryChange={setCalendarQuery}
          />

          <ImportCampaignsAction selectedEventIds={selectedEventIds} calendarQuery={calendarQuery} />
        </>
      )}
    </section>
  );
}
