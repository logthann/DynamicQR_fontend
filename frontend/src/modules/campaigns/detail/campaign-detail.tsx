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
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
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
      setEditCampaignOpen(false);
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
    setEditName(campaign.name || '');
    setEditDescription(campaign.description || '');
    setEditStartDate(campaign.startDate || '');
    setEditEndDate(campaign.endDate || '');
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

  const handleSaveCampaignEdit = async () => {
    const name = editName.trim();
    const description = editDescription.trim();
    const startDate = editStartDate;
    const endDate = editEndDate;

    if (!name) {
      setErrorMessage('Campaign name is required.');
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setErrorMessage('End date must be on or after start date.');
      return;
    }

    try {
      await updateCampaignMutation.mutateAsync({
        campaignId,
        ...sanitizeCampaignPatch({
          name,
          description,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      setEditCampaignOpen(false);
      setErrorMessage(null);
    } catch {
      // Error UI is handled by mutation callbacks.
    }
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
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
              <span className="text-sm text-muted-foreground">(ID: {campaign.id})</span>
              <Badge
                variant="outline"
                className={
                  (campaign.status || 'active') === 'active'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                }
              >
                {(campaign.status || 'active').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Settings
              <MoreHorizontal className="ml-2 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() => {
                setEditCampaignOpen(true);
                setErrorMessage(null);
              }}
            >
              <Pencil className="mr-2 size-4" />
              Edit Campaign
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard?tab=campaigns">
                <ArrowLeft className="mr-2 size-4" />
                Back to Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(event) => event.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Campaign
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this campaign? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteCampaignMutation.isPending}
                    onClick={() => deleteCampaignMutation.mutate({ campaignId })}
                  >
                    {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editCampaignOpen} onOpenChange={setEditCampaignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign details. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Campaign Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Enter campaign description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(event) => setEditStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCampaignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCampaignEdit} disabled={updateCampaignMutation.isPending}>
              {updateCampaignMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.86fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Timeline:</span>
              <span className="rounded-md border bg-muted/30 px-2 py-1 text-sm text-muted-foreground">
                Start: {campaign.startDate || '-'}
              </span>
              <span className="text-muted-foreground">{'->'}</span>
              <span className="rounded-md border bg-muted/30 px-2 py-1 text-sm text-muted-foreground">
                End: {campaign.endDate || '-'}
              </span>
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
            <div className="space-y-3">
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
          <CardContent className="flex flex-1 flex-col space-y-3">
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Integration Hub</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
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
                    {isGoogleConnected ? 'oauth connected' : 'not linked'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-muted-foreground" />
                    <span className="text-sm">Google Auto Calendar</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      hasCalendarScope
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 text-xs'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {hasCalendarScope ? 'connected' : 'not linked'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">Sync Required</span>
                </div>
                <p className="text-xs text-amber-700/80">
                  {integrationsLoading
                    ? 'Checking Google connection...'
                    : isCampaignSynced
                      ? `Status: ${calendarSyncStatus.replace('_', ' ')}`
                      : 'Status: not linked'}
                </p>
                {campaign.calendarLastSyncedAt && (
                  <p className="text-xs text-amber-700/80">
                    Last synced: {new Date(campaign.calendarLastSyncedAt).toLocaleString()}
                  </p>
                )}
                {connectedAccountEmail && <p className="text-xs text-amber-700/80">Account: {connectedAccountEmail}</p>}
              </div>

              <div className="space-y-2 pt-1">
                {isGoogleConnected && !isCampaignSynced && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-muted text-muted-foreground hover:bg-muted"
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

                {!isGoogleConnected && <p className="text-xs text-muted-foreground">{connectedProviderLabel}</p>}
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

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
    </section>
  );
}

