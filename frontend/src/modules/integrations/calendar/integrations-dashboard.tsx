/**
 * Integration dashboard wiring calendar browse/import/sync flows.
 */

'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2, Link2, Unplug } from 'lucide-react';
import CalendarEventsList from '@/modules/integrations/calendar/events/calendar-events-list';
import ImportCampaignsAction from '@/modules/integrations/calendar/import/import-campaigns-action';
import IntegrationStatusPanel from '@/modules/integrations/status/integration-status-panel';
import { useIntegrationContext } from '@/state/integration-context';
import DashboardIntegrationActions from '@/modules/integrations/calendar/dashboard-integration-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      <Card className="border-muted bg-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Google Integrations</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Manage Google connection, scope readiness, and import events into campaigns.
              </CardDescription>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{connectedProviderLabel}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-muted bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Connection</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              {isGoogleConnected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Unplug className="h-4 w-4 text-muted-foreground" />}
              {isGoogleConnected ? 'Connected' : 'Not connected'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-muted bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Current mode</CardDescription>
            <CardTitle className="text-base capitalize">{mode === 'none' ? 'Idle' : mode}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-muted bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Selected events</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-primary" />
              {selectedEventIds.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <IntegrationStatusPanel />

      <DashboardIntegrationActions mode={mode} onModeChange={setMode} />

      {isGoogleConnected && mode === 'import' && (
        <Card className="border-muted bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Import from Google Calendar</CardTitle>
            <CardDescription>
              Select a period, choose events, and import them as campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <CalendarEventsList
            selectedEventIds={selectedEventIds}
            onSelectionChange={setSelectedEventIds}
            calendarQuery={calendarQuery}
            onCalendarQueryChange={setCalendarQuery}
          />

          <ImportCampaignsAction selectedEventIds={selectedEventIds} calendarQuery={calendarQuery} />
          </CardContent>
        </Card>
      )}
    </section>
  );
}
