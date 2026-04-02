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
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryClient, queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { Campaign } from '@/lib/api/generated/types';

export default function CampaignList() {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft' | 'archived'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteCampaign,
    onSuccess: () => {
      cacheInvalidations.deleteCampaign();
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      setActionMessage('Campaign deleted successfully.');
    },
    onError: (err: any) => {
      setActionMessage(err?.message || 'Failed to delete campaign.');
    },
  });

  const filteredCampaigns = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return campaigns.filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) {
        return false;
      }

      const campaignStartDate = campaign.startDate ? new Date(campaign.startDate) : null;
      if (!campaignStartDate || Number.isNaN(campaignStartDate.getTime())) {
        return periodFilter === 'all' && !fromDate && !toDate;
      }

      if (periodFilter === 'today' && campaignStartDate < startOfToday) {
        return false;
      }
      if (periodFilter === 'this_month' && campaignStartDate < startOfMonth) {
        return false;
      }
      if (periodFilter === 'this_year' && campaignStartDate < startOfYear) {
        return false;
      }

      if (fromDate) {
        const from = new Date(fromDate);
        if (campaignStartDate < from) {
          return false;
        }
      }

      if (toDate) {
        const to = new Date(toDate);
        if (campaignStartDate > to) {
          return false;
        }
      }

      return true;
    });
  }, [campaigns, fromDate, periodFilter, statusFilter, toDate]);

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

      <div className="grid gap-3 rounded-lg border border-muted bg-card p-4 md:grid-cols-4">
        <label className="text-xs text-muted-foreground">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          Period
          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value as typeof periodFilter)}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this_month">This month</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom range</option>
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>

        <label className="text-xs text-muted-foreground">
          To
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
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
      {!isLoading && !isError && filteredCampaigns.length === 0 && (
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
      {!isLoading && !isError && filteredCampaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign: Campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              isDeleting={deleteMutation.isPending}
              onDelete={(campaignId) => {
                const confirmed = window.confirm('Delete this campaign? This action cannot be undone.');
                if (!confirmed) {
                  return;
                }
                setActionMessage(null);
                deleteMutation.mutate({ campaignId });
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
  onDelete,
  isDeleting,
}: {
  campaign: Campaign;
  onDelete: (campaignId: string) => void;
  isDeleting: boolean;
}) {
  const statusLabel = (campaign.status || 'active').replace('_', ' ');
  const calendarStatus = campaign.calendarSyncStatus || 'not_linked';
  const isLinked =
    Boolean(campaign.googleEventId) ||
    calendarStatus === 'synced' ||
    calendarStatus === 'out_of_sync';

  const campaignRecord = campaign as unknown as Record<string, unknown>;
  const qrCountValue = campaignRecord.qrCount ?? campaignRecord.qr_count;
  const qrCount = typeof qrCountValue === 'number' ? qrCountValue : null;

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
        <div className="grid gap-1 text-xs text-muted-foreground">
          <span>Start: {campaign.startDate || '-'}</span>
          <span>End: {campaign.endDate || '-'}</span>
          <span>QR codes: {qrCount ?? 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Calendar status</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              isLinked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {isLinked ? 'Linked' : 'Not linked'}
          </span>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(campaign.id)}
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );
}
