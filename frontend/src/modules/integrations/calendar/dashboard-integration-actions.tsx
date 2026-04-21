'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient, APIError } from '@/lib/api/client';
import * as Types from '@/lib/api/generated/types';
import { cacheInvalidations, queryClient, queryKeys, staleTimes } from '@/lib/cache/query-client';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';
import { useIntegrationContext } from '@/state/integration-context';

type IntegrationMode = 'none' | 'sync' | 'import' | 'remove';

type QueueStatus = 'idle' | 'pending' | 'success' | 'error';

const OAUTH_RETURN_PATH_KEY = 'dqr:oauth-return-path';

function normalizeCampaignId(rawId: string): string {
  const trimmed = String(rawId || '').trim();
  if (!trimmed) return '';

  // Keep only numeric route id when UI accidentally carries decorated labels.
  const directNumeric = Number(trimmed);
  if (Number.isInteger(directNumeric) && directNumeric >= 0) {
    return String(directNumeric);
  }

  const matches = trimmed.match(/\d+/g);
  return matches && matches.length > 0 ? matches[matches.length - 1] : trimmed;
}

function isDeleteFailedError(error: unknown): error is APIError {
  const apiError = error as APIError | undefined;
  if (!apiError || apiError.status !== 400) {
    return false;
  }

  const message = String(apiError.message || '').toLowerCase();
  const details = JSON.stringify(apiError.details || {}).toLowerCase();
  return message.includes('delete failed') || details.includes('delete failed');
}

function applyOptimisticUnlink(campaignId: string) {
  queryClient.setQueriesData<Types.GetCampaignsResponse>(
    { queryKey: queryKeys.campaigns.lists() },
    (current) => {
      if (!current?.campaigns) {
        return current;
      }

      return {
        ...current,
        campaigns: current.campaigns.map((campaign) =>
          String(campaign.id) === campaignId
            ? {
                ...campaign,
                googleEventId: undefined,
                calendarSyncStatus: 'not_linked',
                calendarLastSyncedAt: undefined,
              }
            : campaign
        ),
      };
    }
  );

  queryClient.setQueryData<Types.Campaign | undefined>(
    queryKeys.campaigns.detail(campaignId),
    (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        googleEventId: undefined,
        calendarSyncStatus: 'not_linked',
        calendarLastSyncedAt: undefined,
      };
    }
  );
}

export default function DashboardIntegrationActions({
  mode,
  onModeChange,
}: {
  mode: IntegrationMode;
  onModeChange: (mode: IntegrationMode) => void;
}) {
  const { isGoogleConnected, refetchIntegrations } = useIntegrationContext();
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [queueResults, setQueueResults] = useState<Record<string, QueueStatus>>({});
  const [queueMessage, setQueueMessage] = useState<string>('');

  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns.list({ scope: 'integration-mode' }),
    queryFn: () => apiClient.getCampaigns(),
    staleTime: staleTimes.campaigns,
    enabled: isGoogleConnected,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = getGoogleOAuthRedirectUri();
      return apiClient.startIntegrationConnect({
        provider: 'google_calendar',
        redirectUri,
      });
    },
    onSuccess: (result) => {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, '/dashboard?tab=integrations&google=connected');
        window.location.assign(result.authorizationUrl);
      }
    },
  });

  const switchAccountMutation = useMutation({
    mutationFn: async () => {
      await apiClient.disconnectIntegration({ providerName: 'google_calendar' });
      const redirectUri = getGoogleOAuthRedirectUri();
      return apiClient.startIntegrationConnect({
        provider: 'google_calendar',
        redirectUri,
      });
    },
    onSuccess: async (result) => {
      await refetchIntegrations();
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, '/dashboard?tab=integrations&google=connected');
        window.location.assign(result.authorizationUrl);
      }
    },
  });

  const filteredCampaigns = useMemo(() => {
    const all = campaignsQuery.data?.campaigns ?? [];
    if (mode === 'sync') {
      return all.filter((campaign) => {
        const syncStatus = campaign.calendarSyncStatus ?? 'not_linked';
        // A previously unlinked campaign must be available for re-sync.
        return syncStatus === 'not_linked' || syncStatus === 'removed';
      });
    }
    if (mode === 'remove') {
      return all.filter(
        (campaign) =>
          Boolean(campaign.googleEventId) ||
          campaign.calendarSyncStatus === 'synced' ||
          campaign.calendarSyncStatus === 'out_of_sync'
      );
    }
    return all;
  }, [campaignsQuery.data?.campaigns, mode]);

  const runQueueMutation = useMutation({
    mutationFn: async (action: 'sync' | 'remove') => {
      if (selectedCampaignIds.length === 0) {
        throw new Error('Select at least one campaign.');
      }

      let forcedUnlinkCount = 0;
      const nextResults: Record<string, QueueStatus> = {};
      selectedCampaignIds.forEach((id) => {
        nextResults[id] = 'pending';
      });
      setQueueResults(nextResults);
      setQueueMessage(`Running ${action} queue for ${selectedCampaignIds.length} campaign(s)...`);

      for (const rawCampaignId of selectedCampaignIds) {
        const campaignId = normalizeCampaignId(rawCampaignId);

        if (!campaignId) {
          setQueueResults((prev) => ({ ...prev, [rawCampaignId]: 'error' }));
          continue;
        }

        try {
          if (action === 'sync') {
            await apiClient.syncCampaign({ campaignId });
            cacheInvalidations.syncCampaignToCalendar(campaignId);
          } else {
            try {
              await apiClient.unlinkCampaign({ campaignId });
            } catch (error) {
              if (!isDeleteFailedError(error)) {
                throw error;
              }

              const shouldForceUnlink =
                typeof window !== 'undefined'
                  ? window.confirm(
                      'Google event deletion failed for this campaign. Do you want to force unlink and clear calendar fields locally?'
                    )
                  : false;

              if (!shouldForceUnlink) {
                throw error;
              }

              await apiClient.updateCampaign({
                campaignId,
                google_event_id: null,
                calendar_sync_status: 'not_linked',
                calendar_last_synced_at: null,
                calendar_sync_hash: null,
              });

              forcedUnlinkCount += 1;
            }

            applyOptimisticUnlink(campaignId);
            cacheInvalidations.unlinkCampaignFromCalendar(campaignId);
          }
          setQueueResults((prev) => ({ ...prev, [rawCampaignId]: 'success' }));
        } catch {
          setQueueResults((prev) => ({ ...prev, [rawCampaignId]: 'error' }));
        }
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      await refetchIntegrations();

      return { action, forcedUnlinkCount };
    },
    onSuccess: ({ action, forcedUnlinkCount }) => {
      if (action === 'remove' && forcedUnlinkCount > 0) {
        setQueueMessage(
          `Queue completed. ${forcedUnlinkCount} campaign(s) were force-unlinked after Google delete failed.`
        );
        return;
      }
      setQueueMessage('Queue completed. Refreshing campaign statuses.');
    },
    onError: (error: any) => {
      setQueueMessage(error?.message || 'Queue failed.');
    },
  });

  const allSelected = filteredCampaigns.length > 0 && selectedCampaignIds.length === filteredCampaigns.length;

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground">Calendar Integration Actions</h2>

      {!isGoogleConnected && (
        <button
          type="button"
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {connectMutation.isPending ? 'Opening Google OAuth...' : 'Connect Google Calendar'}
        </button>
      )}

      {isGoogleConnected && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onModeChange('sync')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'sync' ? 'bg-primary text-primary-foreground' : 'border border-muted bg-background text-foreground'}`}
          >
            Sync
          </button>
          <button
            type="button"
            onClick={() => onModeChange('import')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'import' ? 'bg-primary text-primary-foreground' : 'border border-muted bg-background text-foreground'}`}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => onModeChange('remove')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'remove' ? 'bg-primary text-primary-foreground' : 'border border-muted bg-background text-foreground'}`}
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => switchAccountMutation.mutate()}
            disabled={switchAccountMutation.isPending}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 disabled:opacity-50"
          >
            {switchAccountMutation.isPending ? 'Switching...' : 'Switch Account'}
          </button>
        </div>
      )}

      {isGoogleConnected && (mode === 'sync' || mode === 'remove') && (
        <div className="space-y-3 rounded-md border border-muted p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mode === 'sync' ? 'Select not linked campaigns to sync.' : 'Select linked campaigns to remove from calendar.'}
            </p>
            <label className="text-xs text-foreground">
              <input
                type="checkbox"
                className="mr-2"
                checked={allSelected}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedCampaignIds(filteredCampaigns.map((c) => String(c.id)));
                  } else {
                    setSelectedCampaignIds([]);
                  }
                }}
              />
              Select all
            </label>
          </div>

          {campaignsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading campaigns...</p>}

          {!campaignsQuery.isLoading && filteredCampaigns.length === 0 && (
            <p className="text-sm text-muted-foreground">No campaigns available for this action.</p>
          )}

          <div className="max-h-64 space-y-2 overflow-auto">
            {filteredCampaigns.map((campaign) => {
              const id = String(campaign.id);
              const status = queueResults[id] || 'idle';
              return (
                <label key={id} className="flex items-center justify-between rounded border border-muted p-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCampaignIds.includes(id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedCampaignIds((prev) => [...prev, id]);
                        } else {
                          setSelectedCampaignIds((prev) => prev.filter((item) => item !== id));
                        }
                      }}
                    />
                    <span className="text-foreground">{campaign.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{status}</span>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            disabled={runQueueMutation.isPending || selectedCampaignIds.length === 0}
            onClick={() => runQueueMutation.mutate(mode === 'sync' ? 'sync' : 'remove')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {runQueueMutation.isPending ? 'Processing queue...' : mode === 'sync' ? 'Run Sync Queue' : 'Run Remove Queue'}
          </button>

          {queueMessage && <p className="text-xs text-muted-foreground">{queueMessage}</p>}
        </div>
      )}
    </section>
  );
}

