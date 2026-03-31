/**
 * Campaign calendar sync/unlink actions (AC-010, AC-011)
 * POST /api/v1/campaigns/{campaign_id}/calendar/sync
 * DELETE /api/v1/campaigns/{campaign_id}/calendar/link
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

interface ErrorWithStatus {
  status?: number;
}

function toIntegrationErrorState(error: unknown): IntegrationState {
  const maybeError = error as ErrorWithStatus;
  return maybeError?.status === 403 ? 'permission_blocked' : 'recoverable_error';
}

export default function CalendarSyncActions() {
  const [campaignId, setCampaignId] = useState('');
  const [state, setState] = useState<IntegrationState>('idle');
  const [message, setMessage] = useState('No action executed.');

  const syncMutation = useMutation({
    mutationFn: () => apiClient.syncCampaign({ campaignId }),
    onMutate: () => {
      setState('pending');
      setMessage('Sync in progress...');
    },
    onSuccess: (result) => {
      setState('success');
      setMessage(result.message || `Sync completed with status: ${result.status}`);
      cacheInvalidations.syncCampaignToCalendar(campaignId);
    },
    onError: (error) => {
      const nextState = toIntegrationErrorState(error);
      setState(nextState);
      setMessage(
        nextState === 'permission_blocked'
          ? 'Permission blocked. Cannot sync this campaign.'
          : 'Sync failed. Please retry.'
      );
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: () => apiClient.unlinkCampaign({ campaignId }),
    onMutate: () => {
      setState('pending');
      setMessage('Unlink in progress...');
    },
    onSuccess: (result) => {
      setState('success');
      setMessage(result.message || `Unlink completed with status: ${result.status}`);
      cacheInvalidations.unlinkCampaignFromCalendar(campaignId);
    },
    onError: (error) => {
      const nextState = toIntegrationErrorState(error);
      setState(nextState);
      setMessage(
        nextState === 'permission_blocked'
          ? 'Permission blocked. Cannot unlink this campaign.'
          : 'Unlink failed. Please retry.'
      );
    },
  });

  const isPending = syncMutation.isPending || unlinkMutation.isPending;

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground">Campaign Calendar Sync</h2>

      <label className="block text-sm text-foreground">
        Campaign ID
        <input
          data-testid="campaign-id-input"
          className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          placeholder="campaign_123"
        />
      </label>

      <div className="flex gap-3">
        <button
          data-testid="sync-trigger"
          type="button"
          disabled={!campaignId || isPending}
          onClick={() => syncMutation.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync Campaign'}
        </button>

        <button
          data-testid="unlink-trigger"
          type="button"
          disabled={!campaignId || isPending}
          onClick={() => unlinkMutation.mutate()}
          className="rounded-md border border-muted bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {unlinkMutation.isPending ? 'Unlinking...' : 'Unlink Campaign'}
        </button>
      </div>

      <p data-testid="sync-state" className="text-sm text-foreground">
        State: {state}
      </p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </section>
  );
}

