/**
 * Campaign Detail Component
 *
 * Endpoint: GET /api/v1/campaigns/{campaign_id}
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';
import CampaignQRManager from '@/modules/campaigns/detail/campaign-qr-manager';

interface CampaignDetailProps {
  campaignId: string;
}

export default function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const campaignQuery = useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId),
    queryFn: () => apiClient.getCampaignById({ campaignId }),
    staleTime: staleTimes.campaigns,
    retry: false,
  });

  const updateCampaignMutation = useMutation({
    mutationFn: apiClient.updateCampaign,
    onSuccess: (updated) => {
      cacheInvalidations.updateCampaign(String(updated.id));
      setIsEditing(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to update campaign.');
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: apiClient.deleteCampaign,
    onSuccess: () => {
      cacheInvalidations.deleteCampaign();
      setErrorMessage(null);
      router.push('/campaigns');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to delete campaign.');
    },
  });

  const syncCampaignMutation = useMutation({
    mutationFn: apiClient.syncCampaign,
    onSuccess: () => {
      cacheInvalidations.syncCampaignToCalendar(campaignId);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to sync campaign to calendar.');
    },
  });

  const unlinkCampaignMutation = useMutation({
    mutationFn: apiClient.unlinkCampaign,
    onSuccess: () => {
      cacheInvalidations.unlinkCampaignFromCalendar(campaignId);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to unlink campaign from calendar.');
    },
  });

  if (campaignQuery.isLoading) {
    return (
      <div className="rounded-lg border border-muted bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading campaign detail...</p>
      </div>
    );
  }

  if (campaignQuery.isError) {
    const status = (campaignQuery.error as { status?: number } | null)?.status;
    const message =
      status === 403
        ? 'You do not have permission to view this campaign.'
        : status === 401
          ? 'Your login session is not valid for this campaign.'
          : 'Unable to load campaign detail.';

    return (
      <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p className="text-sm text-destructive">{message}</p>
        <Link
          href="/campaigns"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const campaign = campaignQuery.data;

  const formDefaults = {
    name: campaign?.name || '',
    status: campaign?.status || 'active',
    description: campaign?.description || '',
    startDate: campaign?.startDate || '',
    endDate: campaign?.endDate || '',
  };

  if (!campaign) {
    return (
      <div className="space-y-4 rounded-lg border border-muted bg-card p-6">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
        <Link
          href="/campaigns"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-lg border border-muted bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Campaign ID: {campaign.id}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          {(campaign.status || 'active').replace('_', ' ')}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-md border border-muted p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Start date</p>
          <p className="mt-1 text-sm text-foreground">{campaign.startDate || '-'}</p>
        </article>

        <article className="rounded-md border border-muted p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">End date</p>
          <p className="mt-1 text-sm text-foreground">{campaign.endDate || '-'}</p>
        </article>
      </div>

      <article className="rounded-md border border-muted p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
          {campaign.description || 'No description'}
        </p>
      </article>

      <article className="space-y-3 rounded-md border border-muted p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Google Calendar</p>
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
            {(campaign.calendarSyncStatus || 'not_linked').replace('_', ' ')}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {campaign.googleEventId
            ? `Linked event ID: ${campaign.googleEventId}`
            : 'This campaign is not linked to Google Calendar yet.'}
        </p>

        {campaign.calendarLastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(campaign.calendarLastSyncedAt).toLocaleString()}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={syncCampaignMutation.isPending || unlinkCampaignMutation.isPending}
            onClick={() => syncCampaignMutation.mutate({ campaignId })}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {syncCampaignMutation.isPending ? 'Syncing...' : 'Sync to Calendar'}
          </button>
          <button
            type="button"
            disabled={
              syncCampaignMutation.isPending ||
              unlinkCampaignMutation.isPending ||
              !campaign.googleEventId
            }
            onClick={() => unlinkCampaignMutation.mutate({ campaignId })}
            className="rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {unlinkCampaignMutation.isPending ? 'Removing...' : 'Remove from Calendar'}
          </button>
        </div>
      </article>

      <CampaignQRManager campaignId={String(campaign.id)} />

      {isEditing && (
        <form
          className="space-y-4 rounded-md border border-muted p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const name = String(formData.get('name') || '').trim();
            const status = String(formData.get('status') || 'active');
            const description = String(formData.get('description') || '').trim();
            const startDate = String(formData.get('start_date') || '');
            const endDate = String(formData.get('end_date') || '');

            if (!name) {
              setErrorMessage('Campaign name is required.');
              return;
            }

            if (startDate && endDate && endDate < startDate) {
              setErrorMessage('End date must be on or after start date.');
              return;
            }

            updateCampaignMutation.mutate({
              campaignId,
              name,
              status: status as 'active' | 'paused' | 'draft' | 'archived',
              description: description || undefined,
              start_date: startDate || undefined,
              end_date: endDate || undefined,
            });
          }}
        >
          <h2 className="text-lg font-semibold text-foreground">Edit campaign</h2>

          <label className="block text-sm text-foreground">
            Name
            <input
              name="name"
              defaultValue={formDefaults.name}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              required
            />
          </label>

          <label className="block text-sm text-foreground">
            Status
            <select
              name="status"
              defaultValue={formDefaults.status}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </label>

          <label className="block text-sm text-foreground">
            Description
            <textarea
              name="description"
              defaultValue={formDefaults.description}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              rows={3}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-foreground">
              Start date
              <input
                type="date"
                name="start_date"
                defaultValue={formDefaults.startDate}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="block text-sm text-foreground">
              End date
              <input
                type="date"
                name="end_date"
                defaultValue={formDefaults.endDate}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={updateCampaignMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateCampaignMutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setErrorMessage(null);
              }}
              className="rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setIsEditing((prev) => !prev);
            setErrorMessage(null);
          }}
          className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20"
        >
          {isEditing ? 'Close Edit' : 'Edit Campaign'}
        </button>
        <button
          type="button"
          disabled={deleteCampaignMutation.isPending}
          onClick={() => {
            if (!window.confirm('Delete this campaign? This action cannot be undone.')) {
              return;
            }
            deleteCampaignMutation.mutate({ campaignId });
          }}
          className="inline-flex items-center rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete Campaign'}
        </button>
        <Link
          href="/campaigns"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Back to Campaigns
        </Link>
      </div>
    </section>
  );
}

