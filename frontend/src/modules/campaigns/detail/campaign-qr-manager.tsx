/**
 * Campaign-scoped QR manager for create/list/update/delete/status actions.
 */

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { QRCode } from '@/lib/api/generated/types';
import QRCodePreview from '@/modules/qr/shared/qr-code-preview';

interface CampaignQRManagerProps {
  campaignId: string;
}

export default function CampaignQRManager({ campaignId }: CampaignQRManagerProps) {
  const [createName, setCreateName] = useState('');
  const [createDestinationUrl, setCreateDestinationUrl] = useState('');
  const [createQrType, setCreateQrType] = useState<'url' | 'event'>('url');
  const [createGaMeasurementId, setCreateGaMeasurementId] = useState('');
  const [createUtmSource, setCreateUtmSource] = useState('');
  const [createUtmMedium, setCreateUtmMedium] = useState('');
  const [createUtmCampaign, setCreateUtmCampaign] = useState('');
  const [editQrId, setEditQrId] = useState<string | null>(null);
  const [editDestinationUrl, setEditDestinationUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const campaignIdNumber = Number(campaignId);

  const qrQuery = useQuery({
    queryKey: queryKeys.qr.list({ campaignId }),
    queryFn: () =>
      apiClient.getQRs({
        campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
      }),
    staleTime: staleTimes.campaigns,
    retry: false,
  });

  const campaignQrs = useMemo(
    () => (qrQuery.data?.qrCodes || []).filter((item) => String(item.campaignId) === String(campaignId)),
    [qrQuery.data?.qrCodes, campaignId]
  );

  const createMutation = useMutation({
    mutationFn: apiClient.createQR,
    onSuccess: () => {
      cacheInvalidations.createQR();
      setCreateName('');
      setCreateDestinationUrl('');
      setCreateQrType('url');
      setCreateGaMeasurementId('');
      setCreateUtmSource('');
      setCreateUtmMedium('');
      setCreateUtmCampaign('');
      setMessage('Created QR successfully.');
    },
    onError: (err: any) => setMessage(err?.message || 'Failed to create QR.'),
  });

  const updateMutation = useMutation({
    mutationFn: apiClient.updateQR,
    onSuccess: (updated) => {
      cacheInvalidations.updateQR(String(updated.id));
      setEditQrId(null);
      setEditDestinationUrl('');
      setMessage('Updated QR successfully.');
    },
    onError: (err: any) => setMessage(err?.message || 'Failed to update QR.'),
  });

  const statusMutation = useMutation({
    mutationFn: apiClient.updateQRStatus,
    onSuccess: (updated) => {
      cacheInvalidations.updateQRStatus(String(updated.id));
      setMessage('Updated QR status successfully.');
    },
    onError: (err: any) => setMessage(err?.message || 'Failed to update QR status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteQR,
    onSuccess: () => {
      cacheInvalidations.deleteQR();
      setMessage('Deleted QR successfully.');
    },
    onError: (err: any) => setMessage(err?.message || 'Failed to delete QR.'),
  });

  return (
    <section className="space-y-4 rounded-md border border-muted p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">QR Codes in this campaign</h2>
        <span className="text-xs text-muted-foreground">{campaignQrs.length} item(s)</span>
      </div>

      <form
        className="grid gap-3 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const name = createName.trim();
          const destinationUrl = createDestinationUrl.trim();

          if (!name) {
            setMessage('QR name is required.');
            return;
          }

          if (!destinationUrl) {
            setMessage('Destination URL is required.');
            return;
          }
          setMessage(null);
          createMutation.mutate({
            name,
            campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
            destination_url: destinationUrl,
            qr_type: createQrType,
            ga_measurement_id: createGaMeasurementId || undefined,
            utm_source: createUtmSource || undefined,
            utm_medium: createUtmMedium || undefined,
            utm_campaign: createUtmCampaign || undefined,
            status: 'active',
          });
        }}
      >
        <div className="grid gap-3 md:grid-cols-3 md:col-span-1">
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="QR name"
            required
          />
          <input
            type="url"
            value={createDestinationUrl}
            onChange={(e) => setCreateDestinationUrl(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="https://example.com"
            required
          />
          <select
            value={createQrType}
            onChange={(e) => setCreateQrType(e.target.value as 'url' | 'event')}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="url">url</option>
            <option value="event">event</option>
          </select>

          <input
            type="text"
            value={createGaMeasurementId}
            onChange={(e) => setCreateGaMeasurementId(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="GA ID (optional)"
          />
          <input
            type="text"
            value={createUtmSource}
            onChange={(e) => setCreateUtmSource(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="utm_source"
          />
          <input
            type="text"
            value={createUtmMedium}
            onChange={(e) => setCreateUtmMedium(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="utm_medium"
          />
          <input
            type="text"
            value={createUtmCampaign}
            onChange={(e) => setCreateUtmCampaign(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="utm_campaign"
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create QR'}
        </button>
      </form>

      {qrQuery.isLoading && <p className="text-sm text-muted-foreground">Loading QR list...</p>}
      {qrQuery.isError && <p className="text-sm text-destructive">Failed to load QR list.</p>}

      {!qrQuery.isLoading && !qrQuery.isError && campaignQrs.length === 0 && (
        <p className="text-sm text-muted-foreground">No QR codes in this campaign yet.</p>
      )}

      {!qrQuery.isLoading && !qrQuery.isError && campaignQrs.length > 0 && (
        <div className="space-y-3">
          {campaignQrs.map((qr) => (
            <QRRow
              key={qr.id}
              qr={qr}
              isEditing={editQrId === qr.id}
              editDestinationUrl={editQrId === qr.id ? editDestinationUrl : ''}
              onEditOpen={() => {
                setEditQrId(qr.id);
                setEditDestinationUrl(qr.destination_url);
                setMessage(null);
              }}
              onEditCancel={() => {
                setEditQrId(null);
                setEditDestinationUrl('');
                setMessage(null);
              }}
              onEditDestinationUrlChange={setEditDestinationUrl}
              onSaveEdit={() => {
                const nextDestinationUrl = editDestinationUrl.trim();
                if (!nextDestinationUrl) {
                  setMessage('Destination URL is required.');
                  return;
                }
                setMessage(null);
                updateMutation.mutate({
                  qrId: qr.id,
                  destination_url: nextDestinationUrl,
                  campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
                });
              }}
              onStatusChange={(status) => {
                setMessage(null);
                statusMutation.mutate({ qrId: qr.id, status });
              }}
              onDelete={() => {
                if (!window.confirm('Delete this QR code?')) {
                  return;
                }
                setMessage(null);
                deleteMutation.mutate({ qrId: qr.id });
              }}
              isBusy={
                createMutation.isPending ||
                updateMutation.isPending ||
                statusMutation.isPending ||
                deleteMutation.isPending
              }
            />
          ))}
        </div>
      )}

      {message && (
        <p className="rounded-md border border-muted bg-card p-3 text-sm text-foreground">{message}</p>
      )}
    </section>
  );
}

interface QRRowProps {
  qr: QRCode;
  isEditing: boolean;
  editDestinationUrl: string;
  onEditOpen: () => void;
  onEditCancel: () => void;
  onEditDestinationUrlChange: (value: string) => void;
  onSaveEdit: () => void;
  onStatusChange: (status: 'active' | 'paused' | 'archived') => void;
  onDelete: () => void;
  isBusy: boolean;
}

function QRRow({
  qr,
  isEditing,
  editDestinationUrl,
  onEditOpen,
  onEditCancel,
  onEditDestinationUrlChange,
  onSaveEdit,
  onStatusChange,
  onDelete,
  isBusy,
}: QRRowProps) {
  return (
    <article className="space-y-3 rounded-md border border-muted p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{qr.name || `QR #${qr.id}`}</p>
          <p className="text-sm font-medium text-foreground">/q/{qr.shortCode}</p>
          <p className="break-all text-xs text-muted-foreground">{qr.destination_url}</p>
          <p className="text-xs text-muted-foreground">Type: {qr.qr_type || 'url'}</p>
          {(qr.utm_source || qr.utm_medium || qr.utm_campaign) && (
            <p className="text-xs text-muted-foreground">
              UTM: {qr.utm_source || '-'} / {qr.utm_medium || '-'} / {qr.utm_campaign || '-'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Created {new Date(qr.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={qr.status || 'active'}
            onChange={(event) => onStatusChange(event.target.value as 'active' | 'paused' | 'archived')}
            disabled={isBusy}
            className="rounded border border-muted bg-background px-2 py-1 text-xs text-foreground"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>

          {!isEditing ? (
            <button
              type="button"
              onClick={onEditOpen}
              disabled={isBusy}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditCancel}
              disabled={isBusy}
              className="rounded-md border border-muted bg-background px-3 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            type="url"
            value={editDestinationUrl}
            onChange={(e) => onEditDestinationUrlChange(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="https://example.com"
            required
          />
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isBusy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      <QRCodePreview shortCode={qr.shortCode} fileLabel={qr.name || qr.shortCode} className="mt-1" />
    </article>
  );
}

