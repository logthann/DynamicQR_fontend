"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertTriangle,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { getCampaignById, updateCampaign } from "@/apis/campaigns-api"
import { getGA4Properties } from "@/apis/ga4-api"
import { useIntegrationContext } from "@/state/integration-context"
import { cacheInvalidations, queryKeys, staleTimes } from "@/lib/cache/query-client"
import type { Campaign, GA4Property } from "@/apis/generated/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CampaignEditProps {
  campaignId: string
}

type CampaignPatchBody = {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
  status?: 'active' | 'paused' | 'draft' | 'archived'
  ga_type?: 'OAUTH' | 'MANUAL' | 'NO'
  ga_measurement_id?: string | null
  ga_property_id?: string | null
}

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
  ]

  const payload: CampaignPatchBody = {}

  for (const key of allowedKeys) {
    const value = input[key]
    if (value === undefined) {
      continue
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      payload[key] = (trimmed.length > 0 ? trimmed : undefined) as never
      continue
    }

    payload[key] = value as never
  }

  return payload
}

export default function CampaignEdit({ campaignId }: CampaignEditProps) {
  const router = useRouter()
  const {
    isGoogleConnected,
    hasAnalyticsScope,
    invalidateToken,
  } = useIntegrationContext()

  // Fetch campaign data
  const campaignQuery = useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId),
    queryFn: () => getCampaignById({ campaignId }),
    staleTime: staleTimes.campaigns,
    retry: false,
  })

  // Fetch GA4 properties
  const ga4PropertiesQuery = useQuery({
    queryKey: [...queryKeys.integrations.all, 'ga4-properties'],
    queryFn: () => getGA4Properties(),
    staleTime: staleTimes.calendarEvents,
    retry: false,
    enabled: isGoogleConnected && hasAnalyticsScope,
  })

  // Invalidate token when GA4 properties fail
  React.useEffect(() => {
    if (ga4PropertiesQuery.isError) {
      invalidateToken()
    }
  }, [ga4PropertiesQuery.isError, invalidateToken])

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: updateCampaign,
    onSuccess: () => {
      cacheInvalidations.updateCampaign(campaignId)
      router.push(`/dashboard/campaigns/${campaignId}`)
    },
  })

  // Get campaign data
  const campaign = campaignQuery.data

  // Form state
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [status, setStatus] = React.useState<string>("active")
  const [ga4Mode, setGa4Mode] = React.useState<'OAUTH' | 'MANUAL' | 'NO'>('NO')
  const [selectedGA4MeasurementId, setSelectedGA4MeasurementId] = React.useState("")
  const [manualMeasurementId, setManualMeasurementId] = React.useState("")

  // Validation state
  const [errors, setErrors] = React.useState<{
    name?: string
    dates?: string
  }>({})

  // Initialize form state when campaign data is loaded
  React.useEffect(() => {
    if (campaign) {
      setName(campaign.name || "")
      setDescription(campaign.description || "")
      setStartDate(campaign.startDate || "")
      setEndDate(campaign.endDate || "")
      setStatus(campaign.status || "active")
      const persistedMode = campaign.gaType || campaign.gaMode
      const nextMode = persistedMode === 'OAUTH' || persistedMode === 'MANUAL' ? persistedMode : 'NO'
      setGa4Mode(nextMode)
      setSelectedGA4MeasurementId(campaign.gaMeasurementId || "")
      setManualMeasurementId(campaign.gaMeasurementId || "")
    }
  }, [campaign])

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!name.trim()) {
      newErrors.name = "Campaign name is required"
    } else if (name.trim().length < 3) {
      newErrors.name = "Campaign name must be at least 3 characters"
    }

    if (startDate && endDate && endDate < startDate) {
      newErrors.dates = "End date must be on or after start date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) {
      return
    }

    const oauthMeasurementId = selectedGA4MeasurementId
    const manualId = manualMeasurementId.trim()

    const gaMeasurementId = ga4Mode === 'OAUTH'
      ? oauthMeasurementId || null
      : ga4Mode === 'MANUAL'
        ? manualId || null
        : null

    const gaPropertyId = ga4Mode === 'OAUTH'
      ? ga4PropertiesQuery.data?.properties?.find(
          (p: GA4Property) => p.ga_measurement_id === selectedGA4MeasurementId
        )?.property_id || null
      : null

    updateCampaignMutation.mutate({
      campaignId,
      ...sanitizeCampaignPatch({
        name: name.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        status: status as 'active' | 'paused' | 'draft' | 'archived',
        ga_type: ga4Mode,
        ga_measurement_id: gaMeasurementId,
        ga_property_id: gaPropertyId,
      }),
    })
  }

  const handleConnectGoogle = () => {
    router.push("/dashboard/integrations/setup")
  }

  // Loading state
  if (campaignQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-[#04AA6DFF]" />
        <p className="text-sm text-muted-foreground">Loading campaign data...</p>
      </div>
    )
  }

  // Error state
  if (campaignQuery.isError) {
    const status = (campaignQuery.error as { status?: number } | null)?.status
    const message =
      status === 403
        ? "You do not have permission to view this campaign."
        : status === 401
          ? "Your login session is not valid."
          : "Unable to load campaign detail."

    return (
      <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p className="text-sm text-destructive">{message}</p>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to Campaigns
        </Link>
      </div>
    )
  }

  // Not found state
  if (!campaign) {
    return (
      <div className="space-y-4 rounded-lg border border-muted bg-card p-6">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          Back to Campaigns
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/campaigns/${campaignId}`}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
            <p className="text-sm text-muted-foreground">Update campaign details and settings</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Update the basic details of your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  placeholder="Enter campaign name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }))
                  }}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-description">Description</Label>
                <Input
                  id="campaign-description"
                  placeholder="Enter campaign description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        if (errors.dates) setErrors(prev => ({ ...prev, dates: undefined }))
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        if (errors.dates) setErrors(prev => ({ ...prev, dates: undefined }))
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              {errors.dates && (
                <p className="text-sm text-destructive">{errors.dates}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="campaign-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* GA4 Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="size-5" />
                Google Analytics 4 Configuration
              </CardTitle>
              <CardDescription>
                Configure GA4 tracking for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    checked={ga4Mode === 'OAUTH'}
                    onChange={() => setGa4Mode('OAUTH')}
                  />
                  <span>
                    Use Connected Account
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Recommended
                    </Badge>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Load GA4 properties via backend using your app JWT + stored OAuth token.
                    </span>
                  </span>
                </label>

                {ga4Mode === 'OAUTH' && (
                  <div className="space-y-2 pl-6">
                    {!isGoogleConnected ? (
                      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="size-4" />
                          <span>Connect Google account to use OAuth mode</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleConnectGoogle}
                          className="gap-2"
                        >
                          <svg className="size-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          Connect Google Account
                        </Button>
                      </div>
                    ) : ga4PropertiesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading GA4 properties...
                      </div>
                    ) : ga4PropertiesQuery.isError ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                          <AlertTriangle className="size-4 text-destructive" />
                          <span className="text-sm text-destructive">
                            Unable to load GA4 properties.
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleConnectGoogle}
                          className="gap-2"
                        >
                          <RefreshCw className="size-4" />
                          Reconnect Account
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={selectedGA4MeasurementId}
                        onValueChange={setSelectedGA4MeasurementId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select GA4 property..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ga4PropertiesQuery.data?.properties?.filter((p: GA4Property) => p.ga_measurement_id && p.ga_measurement_id.trim() !== '').map((property: GA4Property) => (
                            <SelectItem
                              key={property.ga_measurement_id}
                              value={property.ga_measurement_id!}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{property.ga_measurement_id}</span>
                                {property.display_name && (
                                  <span className="text-xs text-muted-foreground">{property.display_name}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    checked={ga4Mode === 'MANUAL'}
                    onChange={() => setGa4Mode('MANUAL')}
                  />
                  <span>
                    Manual GA4 Measurement ID
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Set a campaign default tracking code manually.
                    </span>
                  </span>
                </label>

                {ga4Mode === 'MANUAL' && (
                  <div className="pl-6">
                    <Input
                      value={manualMeasurementId}
                      onChange={(e) => setManualMeasurementId(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    checked={ga4Mode === 'NO'}
                    onChange={() => setGa4Mode('NO')}
                  />
                  <span>
                    No GA4 Tracking
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Disable GA4 tracking for this campaign.
                    </span>
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={status === "active" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : ""}
                >
                  {status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date Range</span>
                <span className="font-medium">
                  {startDate || "-"} to {endDate || "-"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GA4 Mode</span>
                <span className="font-medium">{ga4Mode}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={!name.trim() || updateCampaignMutation.isPending}
            >
              {updateCampaignMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              {updateCampaignMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              asChild
            >
              <Link href={`/dashboard/campaigns/${campaignId}`}>
                Cancel
              </Link>
            </Button>
          </div>

          {updateCampaignMutation.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Failed to save campaign. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
