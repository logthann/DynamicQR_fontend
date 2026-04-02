/**
 * Calendar import mutation flow (AC-009)
 * POST /api/v1/integrations/google-calendar/import-campaigns
 * Required UX states: idle, pending, success, recoverable_error, permission_blocked.
 */

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations } from '@/lib/cache/query-client';

type IntegrationState =
  | 'idle'
  | 'pending'
  | 'success'
  | 'recoverable_error'
  | 'permission_blocked';

interface ImportCampaignsActionProps {
  selectedEventIds: string[];
  calendarQuery: {
    rangeType: 'month' | 'year';
    year: number;
    month?: number;
    fromMonth?: number;
    toMonth?: number;
  };
}

interface ErrorWithStatus {
  status?: number;
  message?: string;
}

function toIntegrationErrorState(error: unknown): IntegrationState {
  const maybeError = error as ErrorWithStatus;
  if (maybeError?.status === 403) {
    return 'permission_blocked';
  }
  return 'recoverable_error';
}

export default function ImportCampaignsAction({
  selectedEventIds,
  calendarQuery,
}: ImportCampaignsActionProps) {
  const [state, setState] = useState<IntegrationState>('idle');
  const [message, setMessage] = useState<string>('No import started yet.');

  const importMutation = useMutation({
    mutationFn: () =>
      apiClient.importCampaigns({
        rangeType: calendarQuery.rangeType,
        year: calendarQuery.year,
        month: calendarQuery.rangeType === 'month' ? calendarQuery.month : undefined,
        ...(calendarQuery.rangeType === 'month' &&
        typeof calendarQuery.fromMonth === 'number' &&
        typeof calendarQuery.toMonth === 'number'
          ? {
              fromMonth: calendarQuery.fromMonth,
              toMonth: calendarQuery.toMonth,
            }
          : {}),
        eventIds: selectedEventIds,
      }),
    onMutate: () => {
      setState('pending');
      setMessage('Import is running...');
    },
    onSuccess: (result) => {
      setState('success');
      setMessage(
        `Import done. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}.`
      );
      cacheInvalidations.importCampaignsFromCalendar();
    },
    onError: (error) => {
      const nextState = toIntegrationErrorState(error);
      const maybeError = error as ErrorWithStatus;
      setState(nextState);
      setMessage(
        nextState === 'permission_blocked'
          ? 'Permission blocked. You cannot import campaigns.'
          : maybeError?.status === 400
            ? maybeError.message ||
              'Import rejected by backend. Check range parameters and selected events.'
          : 'Import failed. Please retry.'
      );
    },
  });

  return (
    <section className="space-y-3 rounded-lg border border-muted bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground">Import Selected Events</h2>
      <p className="text-sm text-muted-foreground">
        Selected events: <span data-testid="import-selected-count">{selectedEventIds.length}</span>
      </p>

      <button
        data-testid="import-trigger"
        type="button"
        disabled={selectedEventIds.length === 0 || importMutation.isPending}
        onClick={() => importMutation.mutate()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {importMutation.isPending ? 'Importing...' : 'Import Campaigns'}
      </button>

      <p data-testid="import-state" className="text-sm text-foreground">
        State: {state}
      </p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </section>
  );
}
