/**
 * Campaign Detail Component
 *
 * Endpoint: GET /api/v1/campaigns/{campaign_id}
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  FileText,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations, queryKeys, staleTimes } from '@/lib/cache/query-client';
import CampaignQRManager from '@/modules/campaigns/detail/campaign-qr-manager';
import {
  isValidManualMeasurementId,
  shouldEnableGA4PropertiesQuery,
  type GA4Mode,
} from '@/modules/ga4/ga4-mode';
import { useIntegrationContext } from '@/state/integration-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignDetailProps {
  campaignId: string;
}

type CampaignPatchBody = {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'paused' | 'draft' | 'archived';
  ga_type?: 'OAUTH' | 'MANUAL' | 'NO';
  ga_measurement_id?: string | null;
  ga_property_id?: string | null;
  google_event_id?: string | null;
  calendar_sync_status?: 'not_linked' | 'synced' | 'out_of_sync' | 'removed' | null;
  calendar_last_synced_at?: string | null;
  calendar_sync_hash?: string | null;
};

function sanitizeCampaignPatch(input: Record<string, unknown>): CampaignPatchBody {
  const allowedKeys: Array<keyof CampaignPatchBody> = [
    'name',
    'description',
    'start_date',
    'end_date',
    'status',
    'ga_type',
    'ga_measurement_id',
    'ga_property_id',
    'google_event_id',
    'calendar_sync_status',
    'calendar_last_synced_at',
    'calendar_sync_hash',
  ];

  const payload: CampaignPatchBody = {};

  for (const key of allowedKeys) {
    const value = input[key];
    if (value === undefined) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      payload[key] = (trimmed.length > 0 ? trimmed : undefined) as never;
      continue;
    }

    payload[key] = value as never;
  }

  return payload;
}

export default function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const router = useRouter();
  const {
    isLoading: integrationsLoading,
    isGoogleConnected,
    connectedAccountEmail,
    connectedProviderLabel,
    hasCalendarScope,
    hasAnalyticsScope,
    refetchIntegrations,
  } = useIntegrationContext();
  const [ga4Mode, setGa4Mode] = useState<GA4Mode>('MANUAL');
  const [selectedGA4MeasurementId, setSelectedGA4MeasurementId] = useState<string>('');
  const [manualCampaignGA, setManualCampaignGA] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calendarActionMessage, setCalendarActionMessage] = useState<string | null>(null);

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
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to delete campaign.');
    },
  });

  const updateCampaignGAMutation = useMutation({
    mutationFn: apiClient.updateCampaign,
    onSuccess: (updated) => {
      cacheInvalidations.updateCampaign(String(updated.id));
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to update GA4 settings.');
    },
  });

  const syncCampaignMutation = useMutation({
    mutationFn: apiClient.syncCampaign,
    onSuccess: () => {
      cacheInvalidations.syncCampaignToCalendar(campaignId);
      void campaignQuery.refetch();
      void refetchIntegrations();
      setErrorMessage(null);
      setCalendarActionMessage('Campaign synced to Google Calendar successfully.');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to sync campaign to calendar.');
    },
  });

  const unlinkCampaignMutation = useMutation({
    mutationFn: apiClient.unlinkCampaign,
    onSuccess: async () => {
      cacheInvalidations.unlinkCampaignFromCalendar(campaignId);
      // Keep campaign + integration views synchronized after unlink.
      if (campaign?.status) {
        try {
          await apiClient.updateCampaign({ campaignId, status: campaign.status });
          cacheInvalidations.updateCampaign(campaignId);
        } catch {
          // Unlink is already successful; do not fail UI if status patch is rejected.
        }
      }
      await campaignQuery.refetch();
      await refetchIntegrations();
      setErrorMessage(null);
      setCalendarActionMessage('Campaign removed from Google Calendar.');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to remove campaign from calendar.');
    },
  });

  const campaign = campaignQuery.data;

  useEffect(() => {
    if (!campaign) {
      return;
    }

    const persistedMode = campaign.gaType || campaign.gaMode;
    const nextMode = persistedMode === 'OAUTH' ? 'OAUTH' : 'MANUAL';
    setGa4Mode(nextMode);
    setSelectedGA4MeasurementId(campaign.gaMeasurementId || '');
    setManualCampaignGA(campaign.gaMeasurementId || '');
  }, [campaign?.id, campaign?.gaType, campaign?.gaMode, campaign?.gaPropertyId, campaign?.gaMeasurementId]);

  const ga4PropertiesQuery = useQuery({
    queryKey: [...queryKeys.integrations.all, 'ga4-properties'],
    queryFn: () => apiClient.getGA4Properties(),
    staleTime: staleTimes.calendarEvents,
    enabled:
      ga4Mode === 'OAUTH' &&
      shouldEnableGA4PropertiesQuery({
        isGoogleConnected,
        hasAnalyticsScope,
      }),
  });

  useEffect(() => {
    if (selectedGA4MeasurementId) {
      return;
    }

    if (!campaign?.gaPropertyId) {
      return;
    }

    const fromPropertyId = (ga4PropertiesQuery.data?.properties ?? []).find(
      (property) => property.property_id === campaign.gaPropertyId
    );

    if (fromPropertyId?.ga_measurement_id) {
      setSelectedGA4MeasurementId(fromPropertyId.ga_measurement_id);
    }
  }, [selectedGA4MeasurementId, campaign?.gaPropertyId, ga4PropertiesQuery.data?.properties]);


  const selectedGA4Property = (ga4PropertiesQuery.data?.properties ?? []).find(
    (property) => property.ga_measurement_id === selectedGA4MeasurementId
  );

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
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const calendarSyncStatus = campaign?.calendarSyncStatus || 'not_linked';
  const isCampaignSynced =
    calendarSyncStatus === 'synced' ||
    calendarSyncStatus === 'out_of_sync' ||
    Boolean(campaign?.googleEventId);
  const isCalendarActionPending = syncCampaignMutation.isPending || unlinkCampaignMutation.isPending;

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
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
          <span className="text-sm text-muted-foreground">(ID: {campaign.id})</span>
          <Badge
            variant="outline"
            className={
              (campaign.status || 'active') === 'active'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                : 'border-amber-500/50 bg-amber-500/10 text-amber-500'
            }
          >
            {(campaign.status || 'active').toUpperCase()}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing((prev) => !prev);
              setErrorMessage(null);
            }}
          >
            <Pencil className="mr-2 size-4" />
            {isEditing ? 'Close Edit' : 'Edit Campaign'}
          </Button>
          <Button
            variant="outline"
            disabled={deleteCampaignMutation.isPending}
            onClick={() => {
              if (!window.confirm('Delete this campaign? This action cannot be undone.')) {
                return;
              }
              deleteCampaignMutation.mutate({ campaignId });
            }}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 size-4" />
            {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 size-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Timeline:</span>
              <span className="text-sm text-muted-foreground">{campaign.startDate || '-'}</span>
              <span className="text-muted-foreground">{'->'}</span>
              <span className="text-sm text-muted-foreground">{campaign.endDate || '-'}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">Description</span>
              </div>
              <p className="pl-7 text-sm leading-relaxed text-muted-foreground">
                {campaign.description || 'No description provided.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status</CardTitle>
              <Badge
                variant="secondary"
                className={campaign.gaMeasurementId ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'text-amber-500'}
              >
                <BarChart3 className="mr-1.5 size-3" />
                {campaign.gaMeasurementId ? 'Tracking Active' : 'No Tracking'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <div className="space-y-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Integrations</span>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-sm">Google Calendar</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isGoogleConnected
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 text-xs'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {isGoogleConnected ? 'Connected' : 'Not connected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <span className="text-sm">Google Analytics</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    hasAnalyticsScope
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 text-xs'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {hasAnalyticsScope ? 'Connected' : 'Missing scope'}
                </Badge>
              </div>
            </div>

            <div className="flex-1" />

            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Calendar Sync</span>
              </div>
              <p className="text-xs text-amber-500/80">
                {integrationsLoading
                  ? 'Checking Google connection...'
                  : isCampaignSynced
                    ? `Status: ${calendarSyncStatus.replace('_', ' ')}`
                    : 'Campaign is not synced yet.'}
              </p>
              {campaign.calendarLastSyncedAt && (
                <p className="text-xs text-amber-500/80">
                  Last synced: {new Date(campaign.calendarLastSyncedAt).toLocaleString()}
                </p>
              )}
              {connectedAccountEmail && (
                <p className="text-xs text-amber-500/80">Account: {connectedAccountEmail}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {isGoogleConnected && !isCampaignSynced && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                    disabled={isCalendarActionPending}
                    onClick={() => syncCampaignMutation.mutate({ campaignId })}
                  >
                    <RefreshCw className="mr-2 size-3" />
                    {syncCampaignMutation.isPending ? 'Syncing...' : 'Sync to Google Calendar'}
                  </Button>
                )}

                {isGoogleConnected && isCampaignSynced && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={isCalendarActionPending}
                    onClick={() => {
                      if (!window.confirm('Remove this campaign from Google Calendar?')) {
                        return;
                      }
                      unlinkCampaignMutation.mutate({ campaignId });
                    }}
                  >
                    {unlinkCampaignMutation.isPending ? 'Removing...' : 'Remove from Calendar'}
                  </Button>
                )}

                {!isGoogleConnected && (
                  <p className="w-full text-xs text-muted-foreground">
                    {connectedProviderLabel}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {calendarActionMessage && (
        <Card>
          <CardContent className="p-3 text-sm text-muted-foreground">{calendarActionMessage}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Google Analytics 4 Configuration</CardTitle>
          <CardDescription>Configure GA4 tracking for this campaign.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="radio" checked={ga4Mode === 'OAUTH'} onChange={() => setGa4Mode('OAUTH')} />
              <span>
                Use Connected Account
                <Badge variant="secondary" className="ml-2 text-xs">
                  Recommended
                </Badge>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Load GA4 properties via backend `GET /api/v1/ga4/properties` using your app JWT + stored OAuth token.
                </span>
              </span>
            </label>

            {ga4Mode === 'OAUTH' && (
              <div className="space-y-2">
                <select
                  value={selectedGA4MeasurementId}
                  onChange={(event) => setSelectedGA4MeasurementId(event.target.value)}
                  disabled={!isGoogleConnected || !hasAnalyticsScope || ga4PropertiesQuery.isLoading}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                >
                  <option value="">Select GA4 property...</option>
                  {(ga4PropertiesQuery.data?.properties ?? [])
                    .filter((property) => Boolean(property.ga_measurement_id))
                    .map((property) => (
                      <option key={property.ga_measurement_id} value={property.ga_measurement_id}>
                        {property.display_name}{' '}
                        {property.ga_measurement_id ? `- ${property.ga_measurement_id}` : '- No measurement id'}
                      </option>
                    ))}
                </select>
                {ga4PropertiesQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">Loading properties from backend...</p>
                )}
                {ga4PropertiesQuery.isError && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <span className="text-xs text-destructive">
                      Unable to load GA4 properties. Check OAuth Analytics scope and backend `/ga4/properties`.
                    </span>
                  </div>
                )}
                {!isGoogleConnected && (
                  <p className="text-xs text-amber-500">Connect Google first to use OAuth property mode.</p>
                )}
                {isGoogleConnected && !hasAnalyticsScope && (
                  <p className="text-xs text-amber-500">Analytics scope is missing. Reconnect consent is required.</p>
                )}
                {selectedGA4Property?.ga_measurement_id && (
                  <p className="text-xs text-muted-foreground">
                    Resolved measurement id: {selectedGA4Property.ga_measurement_id}
                  </p>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="radio" checked={ga4Mode === 'MANUAL'} onChange={() => setGa4Mode('MANUAL')} />
              <span>
                GA4 default
                <span className="mt-1 block text-xs text-muted-foreground">
                  Set a campaign default tracking code (you can still override per QR).
                </span>
              </span>
            </label>

            {ga4Mode === 'MANUAL' && (
              <input
                value={manualCampaignGA}
                onChange={(event) => setManualCampaignGA(event.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="G-XXXXXXX"
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Active campaign tracking: {campaign.gaMeasurementId || 'Not configured'}
            {campaign.gaSource ? ` (${campaign.gaSource})` : ''}
          </p>

          <Button
            type="button"
            disabled={updateCampaignGAMutation.isPending}
            onClick={() => {
              const oauthMeasurementId = selectedGA4Property?.ga_measurement_id;
              const manualMeasurementId = manualCampaignGA.trim();

              if (ga4Mode === 'OAUTH' && !selectedGA4MeasurementId) {
                setErrorMessage('Please select a GA4 property for connected-account mode.');
                return;
              }

              if (ga4Mode === 'OAUTH' && !oauthMeasurementId) {
                setErrorMessage('Selected GA4 property does not include a measurement id.');
                return;
              }

              if (ga4Mode === 'MANUAL' && manualMeasurementId && !isValidManualMeasurementId(manualMeasurementId)) {
                setErrorMessage('GA4 default code must match G-XXXXXXXXXX format.');
                return;
              }

              const cleanPayload = sanitizeCampaignPatch({
                ga_type: ga4Mode,
                ga_measurement_id:
                  ga4Mode === 'OAUTH'
                    ? oauthMeasurementId || null
                    : ga4Mode === 'MANUAL'
                      ? manualMeasurementId || null
                      : null,
                ga_property_id: ga4Mode === 'OAUTH' ? selectedGA4Property?.property_id || null : null,
              });

              updateCampaignGAMutation.mutate({
                campaignId,
                ...cleanPayload,
              });
            }}
          >
            <Check className="mr-2 size-4" />
            {updateCampaignGAMutation.isPending ? 'Saving GA4...' : 'Save GA4 Settings'}
          </Button>
        </CardContent>
      </Card>

      <CampaignQRManager
        campaignId={String(campaign.id)}
        campaignDefaultTrackingCode={campaign.gaMeasurementId || undefined}
        campaignTrackingSource={campaign.gaSource || undefined}
        campaignDefaultTrackingPropertyId={campaign.gaPropertyId || undefined}
        campaignGaType={(campaign.gaType || campaign.gaMode || 'MANUAL') as 'OAUTH' | 'MANUAL' | 'NO'}
        ga4Properties={(ga4PropertiesQuery.data?.properties ?? []).filter(
          (property) => Boolean(property.ga_measurement_id)
        )}
      />

      {isEditing && (
        <form
          className="space-y-4 rounded-lg border bg-card p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const name = String(formData.get('name') || '').trim();
            const status = String(formData.get('status') || 'active');
            const description = String(formData.get('description') || '').trim();
            const startDate = String(formData.get('start_date') || '');
            const endDate = String(formData.get('end_date') || '');
            const rawGaMeasurementId = String(formData.get('ga_measurement_id') || '').trim();

            if (!name) {
              setErrorMessage('Campaign name is required.');
              return;
            }

            if (startDate && endDate && endDate < startDate) {
              setErrorMessage('End date must be on or after start date.');
              return;
            }

            if (rawGaMeasurementId && !isValidManualMeasurementId(rawGaMeasurementId)) {
              setErrorMessage('GA4 default code must match G-XXXXXXXXXX format.');
              return;
            }

            const corePayload = sanitizeCampaignPatch({
              name,
              status,
              description,
              start_date: startDate,
              end_date: endDate,
            });

            try {
              await updateCampaignMutation.mutateAsync({
                campaignId,
                ...corePayload,
              });

              const currentGa = (campaign.gaMeasurementId || '').trim();
              if (rawGaMeasurementId && rawGaMeasurementId !== currentGa) {
                const gaPayload = sanitizeCampaignPatch({
                  ga_type: 'MANUAL',
                  ga_property_id: null,
                  ga_measurement_id: rawGaMeasurementId,
                });

                await updateCampaignGAMutation.mutateAsync({
                  campaignId,
                  ...gaPayload,
                });
              }
            } catch {
              // Error states are handled by mutation onError callbacks.
            }
           }}
         >
           <h2 className="text-lg font-semibold text-foreground">Edit Campaign</h2>

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

          <label className="block text-sm text-foreground">
            GA4 default code
            <input
              name="ga_measurement_id"
              defaultValue={campaign.gaMeasurementId || ''}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              placeholder="G-XXXXXXX"
            />
          </label>

          <p className="text-xs text-muted-foreground">
            Campaign content is edited here. GA4 settings are managed in the section above.
          </p>

            <div className="flex gap-3">
            <Button type="submit" disabled={updateCampaignMutation.isPending}>
              {updateCampaignMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setErrorMessage(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="hidden" />
    </section>
  );
}

