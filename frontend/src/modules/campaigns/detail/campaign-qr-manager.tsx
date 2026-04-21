/**
 * Campaign-scoped QR manager for create/list/update/delete/status actions.
 */

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { GA4Property, QRCode } from '@/lib/api/generated/types';
import QRCodePreview from '@/modules/qr/shared/qr-code-preview';

interface CampaignQRManagerProps {
  campaignId: string;
  campaignDefaultTrackingCode?: string;
  campaignTrackingSource?: string;
  campaignDefaultTrackingPropertyId?: string;
  campaignGaType?: 'OAUTH' | 'MANUAL' | 'NO';
  ga4Properties?: GA4Property[];
}

type UTMMediumPreset = 'scan' | 'print' | 'social' | 'email' | 'custom';

type TrackingMode = 'campaign' | 'custom' | 'detect';

type ResolvedTracking = {
  gaType: 'OAUTH' | 'MANUAL';
  gaMeasurementId: string;
  gaPropertyId?: string | null;
};

const MANUAL_TRACKING_OPTION = '__manual__';

export default function CampaignQRManager({
  campaignId,
  campaignDefaultTrackingCode,
  campaignTrackingSource,
  campaignDefaultTrackingPropertyId,
  campaignGaType = 'MANUAL',
  ga4Properties = [],
}: CampaignQRManagerProps) {
  const [createName, setCreateName] = useState('');
  const [createDestinationUrl, setCreateDestinationUrl] = useState('');
  const [createQrType, setCreateQrType] = useState<'url' | 'event'>('url');
  const [createGaMeasurementId, setCreateGaMeasurementId] = useState('');
  const [createTrackingMode, setCreateTrackingMode] = useState<TrackingMode>('campaign');
  const [createCustomTrackingSelection, setCreateCustomTrackingSelection] = useState<string>(
    MANUAL_TRACKING_OPTION
  );
  const [createTrackingEnabled, setCreateTrackingEnabled] = useState(true);
  const [createUtmSource, setCreateUtmSource] = useState('dynamic_qr');
  const [createUtmMediumPreset, setCreateUtmMediumPreset] = useState<UTMMediumPreset>('scan');
  const [createUtmMediumCustom, setCreateUtmMediumCustom] = useState('');
  const [isCreateUtmCampaignSynced, setIsCreateUtmCampaignSynced] = useState(true);
  const [createUtmCampaign, setCreateUtmCampaign] = useState('');
  const [editQrId, setEditQrId] = useState<string | null>(null);
  const [editDestinationUrl, setEditDestinationUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editQrType, setEditQrType] = useState<'url' | 'event'>('url');
  const [editUtmSource, setEditUtmSource] = useState('');
  const [editUtmMedium, setEditUtmMedium] = useState('');
  const [editUtmCampaign, setEditUtmCampaign] = useState('');
  const [editGaMeasurementId, setEditGaMeasurementId] = useState('');
  const [editTrackingMode, setEditTrackingMode] = useState<'campaign' | 'custom'>('campaign');
  const [editCustomTrackingSelection, setEditCustomTrackingSelection] = useState<string>(
    MANUAL_TRACKING_OPTION
  );
  const [editTrackingEnabled, setEditTrackingEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const campaignIdNumber = Number(campaignId);

  const sanitizeHttpUrl = (raw: string): string => raw.trim();

  const resolveUtmMedium = (preset: UTMMediumPreset, customValue: string): string =>
    preset === 'custom' ? customValue.trim() : preset;

  const buildUrlPreview = (destinationUrl: string, utmSource: string, utmMedium: string, utmCampaign: string): string => {
    const cleanUrl = destinationUrl.trim();
    if (!cleanUrl) {
      return 'URL preview: destination URL is required';
    }

    const params = new URLSearchParams();
    if (utmSource.trim()) params.set('utm_source', utmSource.trim());
    if (utmMedium.trim()) params.set('utm_medium', utmMedium.trim());
    if (utmCampaign.trim()) params.set('utm_campaign', utmCampaign.trim());

    try {
      const parsed = new URL(cleanUrl);
      params.forEach((value, key) => parsed.searchParams.set(key, value));
      return parsed.toString();
    } catch {
      const separator = cleanUrl.includes('?') ? '&' : '?';
      const query = params.toString();
      return query ? `${cleanUrl}${separator}${query}` : cleanUrl;
    }
  };

  const getTrackingBadge = (source: 'campaign' | 'connected' | 'manual') => {
    if (source === 'campaign') {
      return '[Campaign Default]';
    }
    if (source === 'connected') {
      return '[Connected]';
    }
    return '[Manual]';
  };

  const resolveCustomTracking = (selection: string, manualMeasurementId: string): ResolvedTracking | undefined => {
    if (selection === MANUAL_TRACKING_OPTION) {
      const manual = manualMeasurementId.trim();
      if (!manual) {
        return undefined;
      }
      return {
        gaType: 'MANUAL',
        gaMeasurementId: manual,
        gaPropertyId: null,
      };
    }

    const selectedProperty = ga4Properties.find((property) => property.ga_measurement_id === selection);
    if (!selectedProperty?.ga_measurement_id) {
      return undefined;
    }

    return {
      gaType: 'OAUTH',
      gaMeasurementId: selectedProperty.ga_measurement_id,
      gaPropertyId: selectedProperty.property_id || null,
    };
  };

  const buildQRPayload = (input: {
    mode: TrackingMode | 'campaign' | 'custom';
    trackingEnabled: boolean;
    customTracking?: ResolvedTracking;
    base: {
      name?: string;
      campaign_id?: number | null;
      destination_url?: string;
      qr_type?: 'url' | 'event';
      design_config?: Record<string, unknown> | null;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      status?: 'active' | 'paused' | 'archived';
    };
  }) => {
    const { mode, trackingEnabled, customTracking, base } = input;

    const payload: {
      name?: string;
      campaign_id?: number | null;
      destination_url?: string;
      qr_type?: 'url' | 'event';
      design_config?: Record<string, unknown> | null;
      ga_type?: 'OAUTH' | 'MANUAL';
      ga_measurement_id?: string;
      ga_property_id?: string | null;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      status?: 'active' | 'paused' | 'archived';
    } = {};

    if (base.name !== undefined) payload.name = base.name.trim();
    if (base.campaign_id !== undefined) payload.campaign_id = base.campaign_id;
    if (base.destination_url !== undefined) payload.destination_url = sanitizeHttpUrl(base.destination_url);
    if (base.qr_type !== undefined) payload.qr_type = base.qr_type;
    if (base.design_config !== undefined) payload.design_config = base.design_config;
    if (base.utm_source !== undefined && base.utm_source.trim()) payload.utm_source = base.utm_source.trim();
    if (base.utm_medium !== undefined && base.utm_medium.trim()) payload.utm_medium = base.utm_medium.trim();
    if (base.utm_campaign !== undefined && base.utm_campaign.trim()) payload.utm_campaign = base.utm_campaign.trim();
    if (base.status !== undefined) payload.status = base.status;

    if (!trackingEnabled) {
      return payload;
    }

    if (mode === 'campaign') {
      const inheritedMeasurement = campaignDefaultTrackingCode?.trim();
      if (!inheritedMeasurement || campaignGaType === 'NO') {
        return payload;
      }

      if (campaignGaType === 'OAUTH') {
        payload.ga_type = 'OAUTH';
        payload.ga_measurement_id = inheritedMeasurement;
        payload.ga_property_id = campaignDefaultTrackingPropertyId?.trim() || null;
      } else {
        payload.ga_type = 'MANUAL';
        payload.ga_measurement_id = inheritedMeasurement;
        payload.ga_property_id = null;
      }

      return payload;
    }

    if (customTracking?.gaMeasurementId) {
      payload.ga_type = customTracking.gaType;
      payload.ga_measurement_id = customTracking.gaMeasurementId.trim();
      payload.ga_property_id =
        customTracking.gaType === 'OAUTH' ? customTracking.gaPropertyId || null : null;
    }

    return payload;
  };

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

  const createResolvedUtmMedium = useMemo(
    () => resolveUtmMedium(createUtmMediumPreset, createUtmMediumCustom),
    [createUtmMediumPreset, createUtmMediumCustom]
  );

  const createUrlPreview = useMemo(
    () =>
      buildUrlPreview(
        createDestinationUrl,
        createUtmSource,
        createResolvedUtmMedium,
        createUtmCampaign
      ),
    [createDestinationUrl, createUtmSource, createResolvedUtmMedium, createUtmCampaign]
  );

  const createMutation = useMutation({
    mutationFn: apiClient.createQR,
    onSuccess: () => {
      cacheInvalidations.createQR();
      setCreateName('');
      setCreateDestinationUrl('');
      setCreateQrType('url');
      setCreateGaMeasurementId('');
      setCreateTrackingMode('campaign');
      setCreateCustomTrackingSelection(MANUAL_TRACKING_OPTION);
      setCreateTrackingEnabled(true);
      setCreateUtmSource('dynamic_qr');
      setCreateUtmMediumPreset('scan');
      setCreateUtmMediumCustom('');
      setIsCreateUtmCampaignSynced(true);
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
      setEditName('');
      setEditQrType('url');
      setEditUtmSource('');
      setEditUtmMedium('');
      setEditUtmCampaign('');
      setEditGaMeasurementId('');
      setEditTrackingMode('campaign');
      setEditCustomTrackingSelection(MANUAL_TRACKING_OPTION);
      setEditTrackingEnabled(true);
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

  const detectGAFromUrl = async (url: string): Promise<string | undefined> => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setMessage('Destination URL is required to auto-detect GA4 code.');
      return undefined;
    }

    try {
      const detected = await apiClient.detectGA4Measurement({ url: cleanUrl });
      const measurementId = detected.ga_measurement_id?.trim();
      if (!measurementId) {
        setMessage('No GA4 code detected on the provided website.');
        return undefined;
      }
      return measurementId;
    } catch (err: any) {
      setMessage(err?.message || 'Failed to auto-detect GA4 code.');
      return undefined;
    }
  };

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
          const resolvedCreateUtmMedium = resolveUtmMedium(createUtmMediumPreset, createUtmMediumCustom);
          const resolvedCreateTracking =
            createTrackingMode === 'campaign'
              ? undefined
              : createTrackingMode === 'detect'
                ? resolveCustomTracking(MANUAL_TRACKING_OPTION, createGaMeasurementId)
                : resolveCustomTracking(createCustomTrackingSelection, createGaMeasurementId);

          if (
            createTrackingEnabled &&
            createTrackingMode !== 'campaign' &&
            !resolvedCreateTracking?.gaMeasurementId
          ) {
            setMessage('Tracking code is required for custom/detect tracking mode.');
            return;
          }

          if (createUtmMediumPreset === 'custom' && !resolvedCreateUtmMedium) {
            setMessage('UTM medium custom value is required when medium is set to Custom.');
            return;
          }

          createMutation.mutate({
            name,
            destination_url: sanitizeHttpUrl(destinationUrl),
            qr_type: createQrType,
            ...buildQRPayload({
              mode: createTrackingMode,
              trackingEnabled: createTrackingEnabled,
              customTracking: resolvedCreateTracking,
              base: {
                name,
                campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
                destination_url: destinationUrl,
                qr_type: createQrType,
                design_config: {
                  tracking_enabled: createTrackingEnabled,
                },
                utm_source: createUtmSource,
                utm_medium: resolvedCreateUtmMedium,
                utm_campaign: createUtmCampaign,
                status: 'active',
              },
            }),
          });
        }}
      >
        <div className="grid gap-3 md:grid-cols-3 md:col-span-1">
          <input
            type="text"
            value={createName}
            onChange={(e) => {
              const nextName = e.target.value;
              setCreateName(nextName);
              if (isCreateUtmCampaignSynced) {
                setCreateUtmCampaign(nextName);
              }
            }}
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

          <div className="md:col-span-3 rounded border border-muted p-2 text-xs text-muted-foreground">
            <p className="flex flex-wrap items-center gap-2">
              <span>
                Campaign active tracking: {campaignDefaultTrackingCode || 'Not configured'}
                {campaignTrackingSource ? ` (${campaignTrackingSource})` : ''}
              </span>
              <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {getTrackingBadge('campaign')}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] ${
                  campaignGaType === 'OAUTH'
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                {campaignGaType === 'OAUTH' ? getTrackingBadge('connected') : getTrackingBadge('manual')}
              </span>
            </p>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={createTrackingEnabled}
                onChange={(e) => setCreateTrackingEnabled(e.target.checked)}
              />
              Enable tracking for this QR
            </label>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="create_tracking_mode"
                  disabled={!createTrackingEnabled}
                  checked={createTrackingMode === 'campaign'}
                  onChange={() => setCreateTrackingMode('campaign')}
                />
                Use campaign tracking code
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="create_tracking_mode"
                  disabled={!createTrackingEnabled}
                  checked={createTrackingMode === 'custom'}
                  onChange={() => setCreateTrackingMode('custom')}
                />
                Use custom tracking code for this QR
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="create_tracking_mode"
                  disabled={!createTrackingEnabled}
                  checked={createTrackingMode === 'detect'}
                  onChange={() => setCreateTrackingMode('detect')}
                />
                Auto-detect from destination URL
              </label>

              {createTrackingMode === 'custom' && (
                <div className="w-full space-y-2 rounded border border-muted p-2">
                  <label className="block text-xs text-muted-foreground">GA4 Tracking Source</label>
                  <select
                    value={createCustomTrackingSelection}
                    onChange={(event) => setCreateCustomTrackingSelection(event.target.value)}
                    disabled={!createTrackingEnabled}
                    className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  >
                    <option value="">Select connected GA4 property...</option>
                    {ga4Properties
                      .filter((property) => Boolean(property.ga_measurement_id))
                      .map((property) => (
                        <option
                          key={property.ga_measurement_id}
                          value={property.ga_measurement_id}
                        >
                          {`${getTrackingBadge('connected')} ${property.display_name} - ${property.ga_measurement_id}`}
                        </option>
                      ))}
                    <option value={MANUAL_TRACKING_OPTION}>{`${getTrackingBadge('manual')} Enter manually`}</option>
                  </select>

                  {createCustomTrackingSelection === MANUAL_TRACKING_OPTION && (
                    <input
                      type="text"
                      value={createGaMeasurementId}
                      onChange={(e) => setCreateGaMeasurementId(e.target.value)}
                      disabled={!createTrackingEnabled}
                      className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="G-XXXXXXXXXX"
                    />
                  )}
                </div>
              )}

              {createTrackingMode === 'detect' && (
                <input
                  type="text"
                  value={createGaMeasurementId}
                  onChange={(e) => setCreateGaMeasurementId(e.target.value)}
                  disabled={!createTrackingEnabled}
                  className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Detected/override GA code (G-XXXXXXXXXX)"
                />
              )}

              <button
                type="button"
                disabled={!createTrackingEnabled || createTrackingMode !== 'detect' || createMutation.isPending}
                onClick={async () => {
                  const measurementId = await detectGAFromUrl(createDestinationUrl);
                  if (!measurementId) {
                    return;
                  }
                  setCreateCustomTrackingSelection(MANUAL_TRACKING_OPTION);
                  setCreateGaMeasurementId(measurementId);
                  setMessage(`Detected GA4 code: ${measurementId}`);
                }}
                className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                Detect GA4 Code
              </button>
            </div>
          </div>
          <details className="md:col-span-3 rounded border border-muted bg-card p-3" open>
            <summary className="cursor-pointer text-sm font-medium text-foreground">Analytics &amp; Tracking</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">UTM Source</label>
                <input
                  type="text"
                  value={createUtmSource}
                  onChange={(e) => setCreateUtmSource(e.target.value)}
                  className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="dynamic_qr"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">UTM Medium</label>
                <select
                  value={createUtmMediumPreset}
                  onChange={(e) => setCreateUtmMediumPreset(e.target.value as UTMMediumPreset)}
                  className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="scan">Scan (Default)</option>
                  <option value="print">Print</option>
                  <option value="social">Social</option>
                  <option value="email">Email</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {createUtmMediumPreset === 'custom' && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Custom Medium Value</label>
                  <input
                    type="text"
                    value={createUtmMediumCustom}
                    onChange={(e) => setCreateUtmMediumCustom(e.target.value)}
                    className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="partner_channel"
                  />
                </div>
              )}

              <div className="md:col-span-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  id="create-utm-sync-with-name"
                  type="checkbox"
                  checked={isCreateUtmCampaignSynced}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCreateUtmCampaignSynced(checked);
                    if (checked) {
                      setCreateUtmCampaign(createName);
                    }
                  }}
                />
                <label htmlFor="create-utm-sync-with-name">Sync utm_campaign with QR name</label>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs text-muted-foreground">UTM Campaign</label>
                <input
                  type="text"
                  value={createUtmCampaign}
                  onChange={(e) => {
                    setCreateUtmCampaign(e.target.value);
                    if (isCreateUtmCampaignSynced) {
                      setIsCreateUtmCampaignSynced(false);
                    }
                  }}
                  disabled={isCreateUtmCampaignSynced}
                  className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground disabled:opacity-70"
                  placeholder="utm_campaign"
                />
              </div>

              <p className="md:col-span-3 rounded border border-muted bg-background px-3 py-2 text-xs text-muted-foreground">
                URL Preview: {createUrlPreview}
              </p>
            </div>
          </details>
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
              editName={editQrId === qr.id ? editName : ''}
              editQrType={editQrId === qr.id ? editQrType : 'url'}
              editUtmSource={editQrId === qr.id ? editUtmSource : ''}
              editUtmMedium={editQrId === qr.id ? editUtmMedium : ''}
              editUtmCampaign={editQrId === qr.id ? editUtmCampaign : ''}
              editGaMeasurementId={editQrId === qr.id ? editGaMeasurementId : ''}
              editTrackingMode={editQrId === qr.id ? editTrackingMode : 'campaign'}
              editTrackingEnabled={editQrId === qr.id ? editTrackingEnabled : true}
              onEditOpen={() => {
                setEditQrId(qr.id);
                setEditName(qr.name || '');
                setEditDestinationUrl(qr.destination_url);
                setEditQrType((qr.qr_type || 'url') as 'url' | 'event');
                setEditUtmSource(qr.utm_source || '');
                setEditUtmMedium(qr.utm_medium || '');
                setEditUtmCampaign(qr.utm_campaign || '');
                const trackingEnabledFromConfig = (qr.design_config as Record<string, unknown> | null)?.tracking_enabled;
                const isTrackingEnabled = trackingEnabledFromConfig !== false;
                setEditTrackingEnabled(isTrackingEnabled);
                const customGa = (qr.ga_measurement_id || '').trim();
                setEditGaMeasurementId(customGa);
                const matchedConnected = ga4Properties.find(
                  (property) => property.ga_measurement_id === customGa
                );
                setEditCustomTrackingSelection(
                  matchedConnected?.ga_measurement_id || MANUAL_TRACKING_OPTION
                );
                setEditTrackingMode(customGa ? 'custom' : 'campaign');
                setMessage(null);
              }}
              onEditCancel={() => {
                setEditQrId(null);
                setEditDestinationUrl('');
                setEditName('');
                setEditQrType('url');
                setEditUtmSource('');
                setEditUtmMedium('');
                setEditUtmCampaign('');
                setEditGaMeasurementId('');
                setEditTrackingMode('campaign');
                setEditCustomTrackingSelection(MANUAL_TRACKING_OPTION);
                setEditTrackingEnabled(true);
                setMessage(null);
              }}
              onEditDestinationUrlChange={setEditDestinationUrl}
              onEditNameChange={setEditName}
              onEditQrTypeChange={setEditQrType}
              onEditUtmSourceChange={setEditUtmSource}
              onEditUtmMediumChange={setEditUtmMedium}
              onEditUtmCampaignChange={setEditUtmCampaign}
              onEditGaMeasurementIdChange={setEditGaMeasurementId}
              onEditTrackingModeChange={setEditTrackingMode}
              onEditTrackingEnabledChange={setEditTrackingEnabled}
              onDetectEditGA={async () => {
                const measurementId = await detectGAFromUrl(editDestinationUrl);
                if (!measurementId) {
                  return;
                }
                setEditCustomTrackingSelection(MANUAL_TRACKING_OPTION);
                setEditGaMeasurementId(measurementId);
                setEditTrackingMode('custom');
                setMessage(`Detected GA4 code: ${measurementId}`);
              }}
              onSaveEdit={() => {
                const nextDestinationUrl = editDestinationUrl.trim();
                const nextName = editName.trim();
                if (!nextDestinationUrl) {
                  setMessage('Destination URL is required.');
                  return;
                }
                if (!nextName) {
                  setMessage('QR name is required.');
                  return;
                }

                const resolvedEditTracking =
                  editTrackingMode === 'campaign'
                    ? undefined
                    : resolveCustomTracking(editCustomTrackingSelection, editGaMeasurementId);

                if (
                  editTrackingEnabled &&
                  editTrackingMode !== 'campaign' &&
                  !resolvedEditTracking?.gaMeasurementId
                ) {
                  setMessage('Custom tracking code is required when edit mode uses custom tracking.');
                  return;
                }
                setMessage(null);

                updateMutation.mutate({
                  qrId: qr.id,
                  ...buildQRPayload({
                    mode: editTrackingMode,
                    trackingEnabled: editTrackingEnabled,
                    customTracking: resolvedEditTracking,
                    base: {
                      name: nextName,
                      destination_url: nextDestinationUrl,
                      qr_type: editQrType,
                      design_config: {
                        ...(qr.design_config || {}),
                        tracking_enabled: editTrackingEnabled,
                      },
                      utm_source: editUtmSource,
                      utm_medium: editUtmMedium,
                      utm_campaign: editUtmCampaign,
                      campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
                    },
                  }),
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
              onTrackingChange={(gaMeasurementId) => {
                setMessage(null);
                const customTracking = gaMeasurementId
                  ? resolveCustomTracking(MANUAL_TRACKING_OPTION, gaMeasurementId)
                  : undefined;
                updateMutation.mutate({
                  qrId: qr.id,
                  ...buildQRPayload({
                    mode: gaMeasurementId ? 'custom' : 'campaign',
                    trackingEnabled: true,
                    customTracking,
                    base: {
                      campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
                    },
                  }),
                });
              }}
              campaignDefaultTrackingCode={campaignDefaultTrackingCode}
              campaignTrackingSource={campaignTrackingSource}
              campaignGaType={campaignGaType}
              ga4Properties={ga4Properties}
              editCustomTrackingSelection={editQrId === qr.id ? editCustomTrackingSelection : MANUAL_TRACKING_OPTION}
              onEditCustomTrackingSelectionChange={setEditCustomTrackingSelection}
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
  campaignDefaultTrackingCode?: string;
  campaignTrackingSource?: string;
  campaignGaType?: 'OAUTH' | 'MANUAL' | 'NO';
  ga4Properties?: GA4Property[];
  isEditing: boolean;
  editName: string;
  editQrType: 'url' | 'event';
  editDestinationUrl: string;
  editUtmSource: string;
  editUtmMedium: string;
  editUtmCampaign: string;
  editGaMeasurementId: string;
  editCustomTrackingSelection: string;
  editTrackingMode: 'campaign' | 'custom';
  editTrackingEnabled: boolean;
  onEditOpen: () => void;
  onEditCancel: () => void;
  onEditNameChange: (value: string) => void;
  onEditQrTypeChange: (value: 'url' | 'event') => void;
  onEditDestinationUrlChange: (value: string) => void;
  onEditUtmSourceChange: (value: string) => void;
  onEditUtmMediumChange: (value: string) => void;
  onEditUtmCampaignChange: (value: string) => void;
  onEditGaMeasurementIdChange: (value: string) => void;
  onEditCustomTrackingSelectionChange: (value: string) => void;
  onEditTrackingModeChange: (value: 'campaign' | 'custom') => void;
  onEditTrackingEnabledChange: (value: boolean) => void;
  onDetectEditGA: () => void;
  onSaveEdit: () => void;
  onStatusChange: (status: 'active' | 'paused' | 'archived') => void;
  onDelete: () => void;
  onTrackingChange: (gaMeasurementId?: string) => void;
  isBusy: boolean;
}

function QRRow({
  qr,
  campaignDefaultTrackingCode,
  campaignTrackingSource,
  campaignGaType = 'MANUAL',
  ga4Properties = [],
  isEditing,
  editName,
  editQrType,
  editDestinationUrl,
  editUtmSource,
  editUtmMedium,
  editUtmCampaign,
  editGaMeasurementId,
  editCustomTrackingSelection,
  editTrackingMode,
  editTrackingEnabled,
  onEditOpen,
  onEditCancel,
  onEditNameChange,
  onEditQrTypeChange,
  onEditDestinationUrlChange,
  onEditUtmSourceChange,
  onEditUtmMediumChange,
  onEditUtmCampaignChange,
  onEditGaMeasurementIdChange,
  onEditCustomTrackingSelectionChange,
  onEditTrackingModeChange,
  onEditTrackingEnabledChange,
  onDetectEditGA,
  onSaveEdit,
  onStatusChange,
  onDelete,
  onTrackingChange,
  isBusy,
}: QRRowProps) {
  const hasCustomTracking = Boolean((qr.ga_measurement_id || '').trim());
  const isTrackingEnabled =
    (qr.design_config as Record<string, unknown> | null)?.tracking_enabled !== false;
  const [isTrackingEditorOpen, setIsTrackingEditorOpen] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState(qr.ga_measurement_id || '');

  const effectiveTrackingCode = !isTrackingEnabled
    ? undefined
    : hasCustomTracking
    ? qr.ga_measurement_id
    : campaignDefaultTrackingCode || undefined;

  const trackingSourceLabel = !isTrackingEnabled
    ? 'Disabled'
    : hasCustomTracking
    ? 'Custom'
    : campaignDefaultTrackingCode
    ? `Campaign (${campaignTrackingSource || 'default'})`
    : 'Not configured';

  const sourceBadge = !isTrackingEnabled
    ? '[Manual]'
    : hasCustomTracking
      ? qr.ga_type === 'OAUTH'
        ? '[Connected]'
        : '[Manual]'
      : '[Campaign Default]';

  return (
    <article className="space-y-3 rounded-md border border-muted p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={`text-xs ${isTrackingEnabled ? 'text-emerald-300' : 'text-amber-300'}`}>
            Tracking: {isTrackingEnabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="text-sm font-medium text-foreground">{qr.name || `QR #${qr.id}`}</p>
          <p className="text-sm font-medium text-foreground">/q/{qr.shortCode}</p>
          <p className="break-all text-xs text-muted-foreground">{qr.destination_url}</p>
          <p className="text-xs text-muted-foreground">Type: {qr.qr_type || 'url'}</p>
          {(qr.utm_source || qr.utm_medium || qr.utm_campaign) && (
            <p className="text-xs text-muted-foreground">
              UTM: {qr.utm_source || '-'} / {qr.utm_medium || '-'} / {qr.utm_campaign || '-'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Tracking source: {trackingSourceLabel}
            <span className="ml-2 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {sourceBadge}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Active tracking code: {effectiveTrackingCode || '-'}
          </p>
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

          <button
            type="button"
            onClick={() => {
              if (hasCustomTracking) {
                onTrackingChange(undefined);
                setTrackingDraft('');
                setIsTrackingEditorOpen(false);
                return;
              }

              setIsTrackingEditorOpen((prev) => !prev);
            }}
            disabled={isBusy}
            className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {hasCustomTracking ? 'Use Campaign Tracking' : isTrackingEditorOpen ? 'Close Tracking Editor' : 'Set Custom Tracking'}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
            <input
              type="checkbox"
              checked={editTrackingEnabled}
              onChange={(e) => onEditTrackingEnabledChange(e.target.checked)}
            />
            Enable tracking for this QR
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name={`edit_tracking_mode_${qr.id}`}
              checked={editTrackingMode === 'campaign'}
              disabled={!editTrackingEnabled}
              onChange={() => onEditTrackingModeChange('campaign')}
            />
            Use campaign tracking
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name={`edit_tracking_mode_${qr.id}`}
              checked={editTrackingMode === 'custom'}
              disabled={!editTrackingEnabled}
              onChange={() => onEditTrackingModeChange('custom')}
            />
            Use custom tracking
          </label>
          {editTrackingMode === 'campaign' && (
            <p className="md:col-span-2 rounded border border-muted bg-background px-3 py-2 text-xs text-muted-foreground">
              Inherited from campaign ({campaignGaType}): {campaignDefaultTrackingCode || 'Not configured'}
              <span className="ml-2 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                [Campaign Default]
              </span>
            </p>
          )}

          {editTrackingMode === 'custom' && (
            <div className="md:col-span-2 space-y-2 rounded border border-muted p-2">
              <label className="block text-xs text-muted-foreground">GA4 Tracking Source</label>
              <select
                value={editCustomTrackingSelection}
                onChange={(event) => onEditCustomTrackingSelectionChange(event.target.value)}
                disabled={!editTrackingEnabled}
                className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
              >
                <option value="">Select connected GA4 property...</option>
                {ga4Properties
                  .filter((property) => Boolean(property.ga_measurement_id))
                  .map((property) => (
                    <option key={property.ga_measurement_id} value={property.ga_measurement_id}>
                      {`[Connected] ${property.display_name} - ${property.ga_measurement_id}`}
                    </option>
                  ))}
                <option value={MANUAL_TRACKING_OPTION}>[Manual] Enter manually</option>
              </select>

              {editCustomTrackingSelection === MANUAL_TRACKING_OPTION && (
                <input
                  type="text"
                  value={editGaMeasurementId}
                  onChange={(e) => onEditGaMeasurementIdChange(e.target.value)}
                  disabled={!editTrackingEnabled}
                  className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="G-XXXXXXXXXX"
                />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onDetectEditGA}
            disabled={!editTrackingEnabled || isBusy}
            className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-50 md:col-span-2"
          >
            Auto-detect GA4 code from destination URL
          </button>
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="QR name"
            required
          />
          <select
            value={editQrType}
            onChange={(e) => onEditQrTypeChange(e.target.value as 'url' | 'event')}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="url">url</option>
            <option value="event">event</option>
          </select>
          <input
            type="url"
            value={editDestinationUrl}
            onChange={(e) => onEditDestinationUrlChange(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="https://example.com"
            required
          />
          <input
            type="text"
            value={editUtmSource}
            onChange={(e) => onEditUtmSourceChange(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="utm_source"
          />
          <input
            type="text"
            value={editUtmMedium}
            onChange={(e) => onEditUtmMediumChange(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="utm_medium"
          />
          <input
            type="text"
            value={editUtmCampaign}
            onChange={(e) => onEditUtmCampaignChange(e.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="utm_campaign"
          />
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isBusy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:col-span-2"
          >
            Save
          </button>
        </div>
      )}

      <QRCodePreview shortCode={qr.shortCode} fileLabel={qr.name || qr.shortCode} className="mt-1" />

      {isTrackingEditorOpen && !hasCustomTracking && (
        <div className="flex flex-col gap-2 rounded border border-muted p-2 md:flex-row md:items-center">
          <input
            type="text"
            value={trackingDraft}
            onChange={(event) => setTrackingDraft(event.target.value)}
            className="w-full rounded border border-muted bg-background px-3 py-2 text-sm text-foreground"
            placeholder="G-XXXXXXXXXX"
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              const value = trackingDraft.trim();
              if (!value) {
                return;
              }
              onTrackingChange(value);
              setTrackingDraft(value);
              setIsTrackingEditorOpen(false);
            }}
            className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Apply Custom Tracking
          </button>
        </div>
      )}
    </article>
  );
}
