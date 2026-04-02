/**
 * Campaign calendar sync/unlink actions (AC-010, AC-011)
 * POST /api/v1/campaigns/{campaign_id}/calendar/sync
 * DELETE /api/v1/campaigns/{campaign_id}/calendar/link
 */

'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';
import { getAuthToken } from '@/lib/api/auth-fetch';

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

const OAUTH_RETURN_PATH_KEY = 'dqr:oauth-return-path';

export default function CalendarSyncActions() {
  const [campaignId, setCampaignId] = useState('');
  const [state, setState] = useState<IntegrationState>('idle');
  const [message, setMessage] = useState('No action executed.');

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.all,
    queryFn: () => apiClient.getIntegrations(),
    staleTime: staleTimes.calendarEvents,
    enabled: Boolean(getAuthToken()),
  });

  const isGoogleCalendarConnected = Boolean(
    integrationsQuery.data?.integrations?.find((provider) => provider.provider === 'google_calendar')
      ?.connected
  );

  const connectMutation = useMutation({
    mutationFn: () => {
      const redirectUri = getGoogleOAuthRedirectUri();
      return apiClient.startIntegrationConnect({ provider: 'google_calendar', redirectUri });
    },
    onMutate: () => {
      setState('pending');
      setMessage('Opening Google OAuth...');
    },
    onSuccess: (result) => {
      setState('success');
      setMessage('Redirecting to Google OAuth. Approve access and return to continue sync.');
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, window.location.pathname + window.location.search);
        window.location.assign(result.authorizationUrl);
      }
    },
    onError: (error: any) => {
      setState(toIntegrationErrorState(error));
      setMessage(error?.message || 'Failed to start Google OAuth.');
    },
  });

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
        (error as any)?.status === 400
          ? 'Sync rejected by backend. Connect Google Calendar first, then retry.'
          : nextState === 'permission_blocked'
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

  const isPending = syncMutation.isPending || unlinkMutation.isPending || connectMutation.isPending;

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

      <div className="rounded-md border border-muted p-3 text-xs text-muted-foreground">
        Google Calendar provider:{' '}
        <span className={isGoogleCalendarConnected ? 'text-emerald-400' : 'text-amber-300'}>
          {isGoogleCalendarConnected ? 'connected' : 'not connected'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isGoogleCalendarConnected && (
          <button
            data-testid="calendar-connect-trigger"
            type="button"
            disabled={isPending}
            onClick={() => connectMutation.mutate()}
            className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {connectMutation.isPending ? 'Opening OAuth...' : 'Connect Google Calendar'}
          </button>
        )}

        <button
          data-testid="sync-trigger"
          type="button"
          disabled={!campaignId || isPending}
          onClick={() => {
            if (!isGoogleCalendarConnected) {
              connectMutation.mutate();
              return;
            }
            syncMutation.mutate();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {syncMutation.isPending
            ? 'Syncing...'
            : isGoogleCalendarConnected
              ? 'Sync Campaign'
              : 'Connect & Sync'}
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
