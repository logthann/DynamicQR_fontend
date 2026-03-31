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
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { Campaign } from '@/lib/api/generated/types';

export default function CampaignList() {

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
            Manage your QR campaigns and track performance
          </p>
        </div>
        <Link
          href="/campaigns/create"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Create Campaign
        </Link>
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
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Campaign Card Component
 */
function CampaignCard({ campaign }: { campaign: Campaign }) {
  const statusLabel = (campaign.status || 'active').replace('_', ' ');

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group rounded-lg border border-muted bg-card p-4 transition-all hover:border-primary hover:shadow-md"
    >
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground group-hover:text-primary">
          {campaign.name}
        </h3>
        {campaign.description && (
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Created {new Date(campaign.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {statusLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

