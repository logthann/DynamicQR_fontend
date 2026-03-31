/**
 * QR Detail Component
 *
 * Endpoints:
 * - GET /api/v1/qr/{qr_id}
 * - PATCH /api/v1/qr/{qr_id}
 * - PATCH /api/v1/qr/{qr_id}/status
 * - DELETE /api/v1/qr/{qr_id}
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';

interface QRDetailProps {
  qrId: string;
}

export default function QRDetail({ qrId }: QRDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const qrQuery = useQuery({
    queryKey: queryKeys.qr.detail(qrId),
    queryFn: () => apiClient.getQRById({ qrId }),
    staleTime: staleTimes.campaigns,
  });

  const updateQRMutation = useMutation({
    mutationFn: apiClient.updateQR,
    onSuccess: (updated) => {
      cacheInvalidations.updateQR(String(updated.id));
      setErrorMessage(null);
      setIsEditing(false);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to update QR.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: apiClient.updateQRStatus,
    onSuccess: (updated) => {
      cacheInvalidations.updateQRStatus(String(updated.id));
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to update QR status.');
    },
  });

  const deleteQRMutation = useMutation({
    mutationFn: apiClient.deleteQR,
    onSuccess: () => {
      cacheInvalidations.deleteQR();
      setErrorMessage(null);
      router.push('/qr');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to delete QR.');
    },
  });

  if (qrQuery.isLoading) {
    return (
      <div className="rounded-lg border border-muted bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading QR detail...</p>
      </div>
    );
  }

  if (qrQuery.isError) {
    return (
      <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p className="text-sm text-destructive">Unable to load QR detail.</p>
        <Link
          href="/qr"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to QR List
        </Link>
      </div>
    );
  }

  const qr = qrQuery.data;

  const formDefaults = useMemo(
    () => ({
      campaignId: qr?.campaignId || '',
      url: qr?.url || '',
      status: qr?.status || 'active',
    }),
    [qr]
  );

  if (!qr) {
    return (
      <div className="rounded-lg border border-muted bg-card p-6">
        <p className="text-sm text-muted-foreground">QR not found.</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-lg border border-muted bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">QR /q/{qr.shortCode}</h1>
          <p className="mt-1 text-sm text-muted-foreground">QR ID: {qr.id}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          {(qr.status || 'active').replace('_', ' ')}
        </span>
      </div>

      <article className="rounded-md border border-muted p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Destination URL</p>
        <p className="mt-2 break-all text-sm text-foreground">{qr.url}</p>
      </article>

      {isEditing && (
        <form
          className="space-y-4 rounded-md border border-muted p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const campaignId = String(formData.get('campaign_id') || '').trim();
            const url = String(formData.get('url') || '').trim();

            if (!url) {
              setErrorMessage('Destination URL is required.');
              return;
            }

            updateQRMutation.mutate({
              qrId,
              campaignId: campaignId || undefined,
              url,
            });
          }}
        >
          <h2 className="text-lg font-semibold text-foreground">Edit QR</h2>

          <label className="block text-sm text-foreground">
            Campaign ID (optional)
            <input
              name="campaign_id"
              defaultValue={formDefaults.campaignId}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              placeholder="Campaign ID"
            />
          </label>

          <label className="block text-sm text-foreground">
            Destination URL
            <input
              name="url"
              type="url"
              defaultValue={formDefaults.url}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              required
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={updateQRMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateQRMutation.isPending ? 'Saving...' : 'Save changes'}
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

      <section className="rounded-md border border-muted p-4">
        <h2 className="text-sm font-semibold text-foreground">Update status</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            defaultValue={formDefaults.status}
            onChange={(event) => {
              updateStatusMutation.mutate({
                qrId,
                status: event.target.value as 'active' | 'paused' | 'archived',
              });
            }}
            className="rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            disabled={updateStatusMutation.isPending}
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
          {updateStatusMutation.isPending && (
            <span className="text-xs text-muted-foreground">Updating status...</span>
          )}
        </div>
      </section>

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
          {isEditing ? 'Close Edit' : 'Edit QR'}
        </button>
        <button
          type="button"
          disabled={deleteQRMutation.isPending}
          onClick={() => {
            if (!window.confirm('Delete this QR code? This action cannot be undone.')) {
              return;
            }
            deleteQRMutation.mutate({ qrId });
          }}
          className="inline-flex items-center rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          {deleteQRMutation.isPending ? 'Deleting...' : 'Delete QR'}
        </button>
        <Link
          href="/qr"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Back to QR List
        </Link>
      </div>
    </section>
  );
}

