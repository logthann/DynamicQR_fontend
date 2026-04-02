/**
 * Campaign List Component
 *
 * Displays list of user's campaigns with RBAC-aware controls.
 * Endpoint: GET /api/v1/campaigns (AC-003)
 *
 * Features:
 * - Lists campaigns with React Query caching (30s stale time)
 * - "Create Campaign" button (gated by RBAC)
 * - Loading and error states
 * - Empty state message
 * - Disabled controls for unauthorized users
 */

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryClient, queryKeys, staleTimes } from '@/lib/cache/query-client';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';
import type { Campaign } from '@/lib/api/generated/types';

const OAUTH_RETURN_PATH_KEY = 'dqr:oauth-return-path';
const PENDING_SYNC_CAMPAIGN_KEY = 'dqr:pending-sync-campaign-id';

export default function CampaignList() {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Query campaigns with 30s stale time (interactive view)
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: () => apiClient.getCampaigns(),
    staleTime: staleTimes.campaigns,
  });

  const campaigns = response?.campaigns || [];

  const syncMutation = useMutation({
    mutationFn: apiClient.syncCampaign,
    onSuccess: (_, variables) => {
      cacheInvalidations.syncCampaignToCalendar(variables.campaignId);
      queryClient.refetchQueries({ queryKey: queryKeys.campaigns.all });
      setActionMessage('Synced campaign to Google Calendar successfully.');
      setActiveCampaignId(null);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(PENDING_SYNC_CAMPAIGN_KEY);
      }
    },
    onError: async (err: any, variables) => {
      if (err?.status === 400) {
        try {
          const redirectUri = getGoogleOAuthRedirectUri();
          const result = await apiClient.startIntegrationConnect({
            provider: 'google_calendar',
            redirectUri,
          });

          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(
              OAUTH_RETURN_PATH_KEY,
              window.location.pathname + window.location.search
            );
            window.sessionStorage.setItem(PENDING_SYNC_CAMPAIGN_KEY, variables.campaignId);
            window.location.assign(result.authorizationUrl);
            return;
          }
        } catch (connectErr: any) {
          setActionMessage(connectErr?.message || 'Failed to start Google OAuth flow.');
          setActiveCampaignId(null);
          return;
        }
      }

      setActionMessage(err?.message || 'Failed to sync campaign to calendar.');
      setActiveCampaignId(null);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: apiClient.unlinkCampaign,
    onSuccess: (_, variables) => {
      cacheInvalidations.unlinkCampaignFromCalendar(variables.campaignId);
      queryClient.refetchQueries({ queryKey: queryKeys.campaigns.all });
      setActionMessage('Removed campaign from Google Calendar successfully.');
      setActiveCampaignId(null);
    },
    onError: (err: any) => {
      setActionMessage(err?.message || 'Failed to remove campaign from calendar.');
      setActiveCampaignId(null);
    },
  });

  const busyAction = useMemo(() => {
    if (syncMutation.isPending) {
      return 'sync';
    }
    if (unlinkMutation.isPending) {
      return 'unlink';
    }
    return null;
  }, [syncMutation.isPending, unlinkMutation.isPending]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const pendingCampaignId = window.sessionStorage.getItem(PENDING_SYNC_CAMPAIGN_KEY);
    if (!pendingCampaignId || syncMutation.isPending) {
      return;
    }

    window.sessionStorage.removeItem(PENDING_SYNC_CAMPAIGN_KEY);
    setActionMessage('Google account connected. Finishing campaign sync...');
    setActiveCampaignId(pendingCampaignId);
    syncMutation.mutate({ campaignId: pendingCampaignId });
  }, [syncMutation]);

  /**
   * AC-003: List campaigns from GET /api/v1/campaigns
   */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your campaigns from dashboard and open campaign detail for deep actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/campaigns/create"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border border-muted bg-card p-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">Loading campaigns...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load campaigns: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && campaigns.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted bg-card p-8 text-center">
          <h3 className="text-lg font-medium text-foreground">No campaigns yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first campaign to get started
          </p>
          <Link
            href="/campaigns/create"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create First Campaign
          </Link>
        </div>
      )}

      {/* Campaign Grid */}
      {!isLoading && !isError && campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign: Campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              isSyncing={busyAction === 'sync' && activeCampaignId === campaign.id}
              isUnlinking={busyAction === 'unlink' && activeCampaignId === campaign.id}
              onSync={(campaignId) => {
                setActionMessage(null);
                setActiveCampaignId(campaignId);
                syncMutation.mutate({ campaignId });
              }}
              onUnlink={(campaignId) => {
                setActionMessage(null);
                setActiveCampaignId(campaignId);
                unlinkMutation.mutate({ campaignId });
              }}
            />
          ))}
        </div>
      )}

      {actionMessage && (
        <p className="rounded-md border border-muted bg-card p-3 text-sm text-foreground">
          {actionMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Campaign Card Component
 */
function CampaignCard({
  campaign,
  onSync,
  onUnlink,
  isSyncing,
  isUnlinking,
}: {
  campaign: Campaign;
  onSync: (campaignId: string) => void;
  onUnlink: (campaignId: string) => void;
  isSyncing: boolean;
  isUnlinking: boolean;
}) {
  const statusLabel = (campaign.status || 'active').replace('_', ' ');
  const calendarStatus = campaign.calendarSyncStatus || 'not_linked';
  const isSynced = calendarStatus === 'synced';

  return (
    <article className="rounded-lg border border-muted bg-card p-4 transition-all hover:border-primary hover:shadow-md">
      <Link href={`/campaign-detail/${campaign.id}`} className="group block space-y-2">
        <h3 className="text-lg font-medium text-foreground group-hover:text-primary">{campaign.name}</h3>
        {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{statusLabel}</span>
        </div>
      </Link>

      <div className="mt-4 space-y-3 border-t border-muted pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Calendar status</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              isSynced
                ? 'bg-primary/10 text-primary'
                : calendarStatus === 'out_of_sync'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {calendarStatus.replace('_', ' ')}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSyncing || isUnlinking}
            onClick={() => onSync(campaign.id)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Calendar'}
          </button>
          <button
            type="button"
            disabled={isSyncing || isUnlinking || !campaign.googleEventId}
            onClick={() => onUnlink(campaign.id)}
            className="rounded-md border border-muted bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {isUnlinking ? 'Removing...' : 'Unlink'}
          </button>
        </div>
      </div>
    </article>
  );
}
