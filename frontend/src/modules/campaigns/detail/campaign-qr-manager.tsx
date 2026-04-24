/**
 * Campaign-scoped QR manager for create/list/update/delete/status actions.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  Trash2,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { GA4Property, QRCode } from '@/lib/api/generated/types';
import QRCodePreview from '@/modules/qr/shared/qr-code-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  const [createQrOpen, setCreateQrOpen] = useState(false);
  const [editQrOpen, setEditQrOpen] = useState(false);
  const [viewQrOpen, setViewQrOpen] = useState(false);
  const [isCreateUtmOpen, setIsCreateUtmOpen] = useState(false);
  const [editUtmOpen, setEditUtmOpen] = useState(false);
  const [editSyncUtmCampaign, setEditSyncUtmCampaign] = useState(true);
  const [selectedQr, setSelectedQr] = useState<QRCode | null>(null);
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
      setCreateQrOpen(false);
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

  const handleCreateQr = () => {
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

    if (createTrackingEnabled && createTrackingMode !== 'campaign' && !resolvedCreateTracking?.gaMeasurementId) {
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
  };

  const openEditQr = (qr: QRCode) => {
    setSelectedQr(qr);
    setEditQrId(qr.id);
    setEditName(qr.name || '');
    setEditDestinationUrl(qr.destination_url || '');
    setEditQrType((qr.qr_type || 'url') as 'url' | 'event');
    setEditUtmSource(qr.utm_source || '');
    setEditUtmMedium(qr.utm_medium || '');
    setEditUtmCampaign(qr.utm_campaign || '');
    const isTrackingEnabled = (qr.design_config as Record<string, unknown> | null)?.tracking_enabled !== false;
    setEditTrackingEnabled(isTrackingEnabled);
    const customGa = (qr.ga_measurement_id || '').trim();
    setEditGaMeasurementId(customGa);
    const matchedConnected = ga4Properties.find((property) => property.ga_measurement_id === customGa);
    setEditCustomTrackingSelection(matchedConnected?.ga_measurement_id || MANUAL_TRACKING_OPTION);
    setEditTrackingMode(customGa ? 'custom' : 'campaign');
    setEditSyncUtmCampaign((qr.utm_campaign || '') === (qr.name || ''));
    setEditUtmOpen(false);
    setEditQrOpen(true);
  };

  const handleSaveEditQr = () => {
    if (!editQrId) {
      return;
    }
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

    if (editTrackingEnabled && editTrackingMode !== 'campaign' && !resolvedEditTracking?.gaMeasurementId) {
      setMessage('Custom tracking code is required when edit mode uses custom tracking.');
      return;
    }
    setMessage(null);

    updateMutation.mutate({
      qrId: editQrId,
      ...buildQRPayload({
        mode: editTrackingMode,
        trackingEnabled: editTrackingEnabled,
        customTracking: resolvedEditTracking,
        base: {
          name: nextName,
          destination_url: nextDestinationUrl,
          qr_type: editQrType,
          design_config: {
            ...(selectedQr?.design_config || {}),
            tracking_enabled: editTrackingEnabled,
          },
          utm_source: editUtmSource,
          utm_medium: editUtmMedium,
          utm_campaign: editUtmCampaign,
          campaign_id: Number.isFinite(campaignIdNumber) ? campaignIdNumber : undefined,
        },
      }),
    });

    setEditQrOpen(false);
  };

  const getCreatedAt = (qr: QRCode): string => {
    const fallback = (qr as unknown as Record<string, unknown>).created_at;
    const raw = qr.createdAt || (typeof fallback === 'string' ? fallback : undefined);
    if (!raw) {
      return '-';
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>QR Codes</CardTitle>
            <span className="text-2xl font-bold text-muted-foreground">{campaignQrs.length} items active</span>
          </div>
          <Dialog open={createQrOpen} onOpenChange={setCreateQrOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create New QR
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Create New QR Code</DialogTitle>
                <DialogDescription>Add a new QR code to this campaign</DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-6 overflow-y-auto py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qr-name">QR Name</Label>
                    <Input
                      id="qr-name"
                      placeholder="e.g., Translate Tool"
                      value={createName}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setCreateName(nextName);
                        if (isCreateUtmCampaignSynced) {
                          setCreateUtmCampaign(nextName);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qr-url">Destination URL</Label>
                    <Input
                      id="qr-url"
                      placeholder="e.g., translate.google.com"
                      value={createDestinationUrl}
                      onChange={(e) => setCreateDestinationUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qr-type">URL Type</Label>
                    <Select value={createQrType} onValueChange={(value) => setCreateQrType(value as 'url' | 'event')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url">url</SelectItem>
                        <SelectItem value="event">event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Tracking settings</Label>
                    <Badge variant="secondary" className="text-amber-500">
                      Active tracking: {campaignDefaultTrackingCode ? 'Configured' : 'Not configured'}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tracking-enabled"
                      checked={createTrackingEnabled}
                      onCheckedChange={(checked) => setCreateTrackingEnabled(Boolean(checked))}
                    />
                    <Label htmlFor="tracking-enabled">Enable tracking for this QR</Label>
                  </div>

                  {createTrackingEnabled && (
                    <RadioGroup
                      value={createTrackingMode === 'detect' ? 'auto' : createTrackingMode}
                      onValueChange={(value) => setCreateTrackingMode(value === 'auto' ? 'detect' : (value as TrackingMode))}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="campaign" id="tracking-campaign" />
                        <Label htmlFor="tracking-campaign">Use campaign tracking code</Label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="tracking-custom" />
                          <Label htmlFor="tracking-custom">Use custom tracking code for this QR</Label>
                        </div>
                        {createTrackingMode === 'custom' && (
                          <div className="ml-6 space-y-2">
                            <Select
                              value={createCustomTrackingSelection}
                              onValueChange={setCreateCustomTrackingSelection}
                              disabled={!createTrackingEnabled}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select connected GA4 property..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ga4Properties
                                  .filter((property) => Boolean(property.ga_measurement_id))
                                  .map((property) => (
                                    <SelectItem key={property.ga_measurement_id} value={property.ga_measurement_id!}>
                                      {`${getTrackingBadge('connected')} ${property.display_name} - ${property.ga_measurement_id}`}
                                    </SelectItem>
                                  ))}
                                <SelectItem value={MANUAL_TRACKING_OPTION}>{`${getTrackingBadge('manual')} Enter manually`}</SelectItem>
                              </SelectContent>
                            </Select>
                            {createCustomTrackingSelection === MANUAL_TRACKING_OPTION && (
                              <Input
                                placeholder="Enter custom GA4 code (e.g., G-XXXXXXXXXX)"
                                value={createGaMeasurementId}
                                onChange={(e) => setCreateGaMeasurementId(e.target.value)}
                                className="max-w-sm"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="auto" id="tracking-auto" />
                        <Label htmlFor="tracking-auto">Auto-detect from destination URL</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="ml-auto h-7 text-xs"
                          disabled={createTrackingMode !== 'detect' || createMutation.isPending}
                          onClick={async () => {
                            const measurementId = await detectGAFromUrl(createDestinationUrl);
                            if (!measurementId) {
                              return;
                            }
                            setCreateCustomTrackingSelection(MANUAL_TRACKING_OPTION);
                            setCreateGaMeasurementId(measurementId);
                            setMessage(`Detected GA4 code: ${measurementId}`);
                          }}
                        >
                          Detect GA4 Code
                        </Button>
                      </div>
                    </RadioGroup>
                  )}
                </div>

                <Collapsible open={isCreateUtmOpen} onOpenChange={setIsCreateUtmOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex w-full justify-between px-0">
                      <span className="font-medium">UTM Settings</span>
                      <ChevronDown className={`size-4 transition-transform ${isCreateUtmOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="utm-source">UTM Source</Label>
                        <Input
                          id="utm-source"
                          value={createUtmSource}
                          onChange={(e) => setCreateUtmSource(e.target.value)}
                          placeholder="dynamic_qr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utm-medium">UTM Medium</Label>
                        {createUtmMediumPreset === 'custom' ? (
                          <Input
                            id="utm-medium"
                            value={createUtmMediumCustom}
                            onChange={(e) => setCreateUtmMediumCustom(e.target.value)}
                            placeholder="partner_channel"
                          />
                        ) : (
                          <Select value={createUtmMediumPreset} onValueChange={(value) => setCreateUtmMediumPreset(value as UTMMediumPreset)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scan">scan</SelectItem>
                              <SelectItem value="print">print</SelectItem>
                              <SelectItem value="social">social</SelectItem>
                              <SelectItem value="email">email</SelectItem>
                              <SelectItem value="custom">custom</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sync-utm"
                        checked={isCreateUtmCampaignSynced}
                        onCheckedChange={(checked) => {
                          const next = Boolean(checked);
                          setIsCreateUtmCampaignSynced(next);
                          if (next) {
                            setCreateUtmCampaign(createName);
                          }
                        }}
                      />
                      <Label htmlFor="sync-utm">Sync utm_campaign with QR name</Label>
                    </div>

                    {!isCreateUtmCampaignSynced && (
                      <div className="space-y-2">
                        <Label htmlFor="utm-campaign">UTM Campaign</Label>
                        <Input
                          id="utm-campaign"
                          value={createUtmCampaign}
                          onChange={(e) => setCreateUtmCampaign(e.target.value)}
                          placeholder="Enter UTM campaign"
                        />
                      </div>
                    )}

                    {createUrlPreview && (
                      <div className="rounded-md border bg-muted/50 p-3">
                        <Label className="text-xs text-muted-foreground">URL Preview</Label>
                        <p className="mt-1 break-all text-xs font-mono">{createUrlPreview}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setCreateQrOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateQr} disabled={!createName.trim() || !createDestinationUrl.trim()}>
                  Create QR
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
      {qrQuery.isLoading && <p className="text-sm text-muted-foreground">Loading QR list...</p>}
      {qrQuery.isError && <p className="text-sm text-destructive">Failed to load QR list.</p>}

      {!qrQuery.isLoading && !qrQuery.isError && campaignQrs.length === 0 && (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">No QR codes in this campaign yet.</p>
        </div>
      )}

      {!qrQuery.isLoading && !qrQuery.isError && campaignQrs.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QR Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Tracking Status</TableHead>
                <TableHead>UTM</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignQrs.map((qr) => {
                const isActive = (qr.status || 'active') === 'active';
                const isTrackingEnabled =
                  (qr.design_config as Record<string, unknown> | null)?.tracking_enabled !== false;
                return (
                  <TableRow key={qr.id}>
                    <TableCell className="font-medium">{qr.name || `QR #${qr.id}`}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{qr.qr_type || 'url'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={isActive}
                        disabled={statusMutation.isPending}
                        onCheckedChange={(checked) => {
                          setMessage(null);
                          statusMutation.mutate({ qrId: qr.id, status: checked ? 'active' : 'paused' });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isTrackingEnabled
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                            : 'border-muted text-muted-foreground'
                        }
                      >
                        GA4: {isTrackingEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {(qr.utm_source || '-') + ' / ' + (qr.utm_medium || '-') + ' / ' + (qr.utm_campaign || '-')}
                    </TableCell>
                    <TableCell>{getCreatedAt(qr)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => { setSelectedQr(qr); setViewQrOpen(true); }}>
                            <Eye className="mr-2 size-4" />
                            See QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEditQr(qr)}>
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 size-4" />
                            Download PNG
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              if (typeof window !== 'undefined') {
                                window.open(`/q/${qr.shortCode}`, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <ExternalLink className="mr-2 size-4" />
                            Open Redirect URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => {
                              if (!window.confirm('Delete this QR code?')) {
                                return;
                              }
                              setMessage(null);
                              deleteMutation.mutate({ qrId: qr.id });
                            }}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editQrOpen} onOpenChange={setEditQrOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit QR Code</DialogTitle>
            <DialogDescription>Update the QR code details and tracking settings</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-qr-name">QR Name</Label>
                <Input id="edit-qr-name" value={editName} onChange={(e) => {
                  const next = e.target.value;
                  setEditName(next);
                  if (editSyncUtmCampaign) {
                    setEditUtmCampaign(next);
                  }
                }} placeholder="e.g., Translate Tool" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-qr-url">Destination URL</Label>
                <Input id="edit-qr-url" value={editDestinationUrl} onChange={(e) => setEditDestinationUrl(e.target.value)} placeholder="e.g., translate.google.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-qr-type">URL Type</Label>
                <Select value={editQrType} onValueChange={(value) => setEditQrType(value as 'url' | 'event')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">url</SelectItem>
                    <SelectItem value="event">event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Tracking settings</Label>
                <Badge variant="secondary" className="text-amber-500">
                  Active tracking: {campaignDefaultTrackingCode ? 'Configured' : 'Not configured'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-tracking-enabled"
                  checked={editTrackingEnabled}
                  onCheckedChange={(checked) => setEditTrackingEnabled(Boolean(checked))}
                />
                <Label htmlFor="edit-tracking-enabled">Enable tracking for this QR</Label>
              </div>

              {editTrackingEnabled && (
                <RadioGroup value={editTrackingMode} onValueChange={(value) => setEditTrackingMode(value as 'campaign' | 'custom')} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="campaign" id="edit-tracking-campaign" />
                    <Label htmlFor="edit-tracking-campaign">Use campaign tracking code</Label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="edit-tracking-custom" />
                      <Label htmlFor="edit-tracking-custom">Use custom tracking code for this QR</Label>
                    </div>
                    {editTrackingMode === 'custom' && (
                      <div className="ml-6 space-y-2">
                        <Select
                          value={editCustomTrackingSelection}
                          onValueChange={setEditCustomTrackingSelection}
                          disabled={!editTrackingEnabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select connected GA4 property..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ga4Properties
                              .filter((property) => Boolean(property.ga_measurement_id))
                              .map((property) => (
                                <SelectItem key={property.ga_measurement_id} value={property.ga_measurement_id!}>
                                  {`[Connected] ${property.display_name} - ${property.ga_measurement_id}`}
                                </SelectItem>
                              ))}
                            <SelectItem value={MANUAL_TRACKING_OPTION}>[Manual] Enter manually</SelectItem>
                          </SelectContent>
                        </Select>

                        {editCustomTrackingSelection === MANUAL_TRACKING_OPTION && (
                          <Input
                            placeholder="Enter custom GA4 code (e.g., G-XXXXXXXXXX)"
                            value={editGaMeasurementId}
                            onChange={(e) => setEditGaMeasurementId(e.target.value)}
                            className="max-w-sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Auto-detect from destination URL</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 text-xs"
                      onClick={async () => {
                        const measurementId = await detectGAFromUrl(editDestinationUrl);
                        if (!measurementId) {
                          return;
                        }
                        setEditCustomTrackingSelection(MANUAL_TRACKING_OPTION);
                        setEditGaMeasurementId(measurementId);
                        setEditTrackingMode('custom');
                        setMessage(`Detected GA4 code: ${measurementId}`);
                      }}
                    >
                      Detect GA4 Code
                    </Button>
                  </div>
                </RadioGroup>
              )}
            </div>

            <Collapsible open={editUtmOpen} onOpenChange={setEditUtmOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex w-full justify-between px-0">
                  <span className="font-medium">UTM Settings</span>
                  <ChevronDown className={`size-4 transition-transform ${editUtmOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-utm-source">UTM Source</Label>
                    <Input
                      id="edit-utm-source"
                      value={editUtmSource}
                      onChange={(e) => setEditUtmSource(e.target.value)}
                      placeholder="dynamic_qr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-utm-medium">UTM Medium</Label>
                    <Input
                      id="edit-utm-medium"
                      value={editUtmMedium}
                      onChange={(e) => setEditUtmMedium(e.target.value)}
                      placeholder="scan"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-sync-utm"
                    checked={editSyncUtmCampaign}
                    onCheckedChange={(checked) => {
                      const next = Boolean(checked);
                      setEditSyncUtmCampaign(next);
                      if (next) {
                        setEditUtmCampaign(editName);
                      }
                    }}
                  />
                  <Label htmlFor="edit-sync-utm">Sync utm_campaign with QR name</Label>
                </div>
                {!editSyncUtmCampaign && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-utm-campaign">UTM Campaign</Label>
                    <Input
                      id="edit-utm-campaign"
                      value={editUtmCampaign}
                      onChange={(e) => setEditUtmCampaign(e.target.value)}
                      placeholder="Enter UTM campaign"
                    />
                  </div>
                )}
                <div className="rounded-md border bg-muted/50 p-3">
                  <Label className="text-xs text-muted-foreground">URL Preview</Label>
                  <p className="mt-1 break-all text-xs font-mono">
                    {buildUrlPreview(editDestinationUrl, editUtmSource, editUtmMedium, editUtmCampaign)}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setEditQrOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditQr} disabled={!editName.trim() || !editDestinationUrl.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewQrOpen} onOpenChange={setViewQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code Preview</DialogTitle>
            <DialogDescription>{selectedQr?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            {selectedQr ? (
              <QRCodePreview shortCode={selectedQr.shortCode} fileLabel={selectedQr.name || selectedQr.shortCode} />
            ) : (
              <div className="flex size-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                <QrCode className="size-24 text-muted-foreground" />
              </div>
            )}
            <div className="w-full space-y-2 text-center">
              <p className="text-sm font-medium">{selectedQr?.name}</p>
              <p className="break-all text-xs text-muted-foreground">{selectedQr?.destination_url}</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full">
              <Download className="mr-2 size-4" />
              Download PNG
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setViewQrOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {message && (
        <p className="rounded-md border border-muted bg-muted/20 p-3 text-sm text-foreground">{message}</p>
      )}
      </CardContent>
    </Card>
  );
}
