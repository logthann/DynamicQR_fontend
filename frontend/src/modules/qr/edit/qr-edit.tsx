"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  ArrowLeft,
  QrCode,
  Link2,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getQRById, updateQR } from "@/apis/qr-api"
import { getCampaigns } from "@/apis/campaigns-api"
import { getGA4Properties } from "@/apis/ga4-api"
import { useIntegrationContext } from "@/state/integration-context"
import { useLanguage } from "@/contexts/language-context"
import { cacheInvalidations, queryKeys, staleTimes } from "@/lib/cache/query-client"
import type { Campaign, GA4Property } from "@/apis/generated/types"


interface EditQRCodePageProps {
  qrId: string
}

export default function EditQRCodePage({ qrId }: EditQRCodePageProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const {
    isGoogleConnected,
    hasAnalyticsScope,
    invalidateToken,
  } = useIntegrationContext()

  // Fetch QR data
  const qrQuery = useQuery({
    queryKey: queryKeys.qr.detail(qrId),
    queryFn: () => getQRById({ qrId }),
    staleTime: staleTimes.campaigns,
    retry: false,
  })

  // Fetch campaigns
  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns.all,
    queryFn: () => getCampaigns(),
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
    setGoogleLoadError(ga4PropertiesQuery.isError)
    if (ga4PropertiesQuery.isError) {
      invalidateToken()
    }
  }, [ga4PropertiesQuery.isError, invalidateToken])

  // Update QR mutation
  const updateQRMutation = useMutation({
    mutationFn: updateQR,
    onSuccess: () => {
      cacheInvalidations.updateQR(qrId)
      router.push("/dashboard/qr")
    },
  })

  // Get QR data
  const qr = qrQuery.data as any
  const campaigns = campaignsQuery.data?.campaigns || []
  const campaignId = qr?.campaignId
  const selectedCampaign = campaigns.find((c: Campaign) => String(c.id) === String(campaignId))

  // Form state
  const [qrName, setQrName] = React.useState("")
  const [qrDescription, setQrDescription] = React.useState("")
  const [qrUrl, setQrUrl] = React.useState("")
  const [qrType, setQrType] = React.useState("url")

  // Tracking state
  const [trackingEnabled, setTrackingEnabled] = React.useState(true)
  const [trackingSource, setTrackingSource] = React.useState("campaign")
  const [customTrackingCode, setCustomTrackingCode] = React.useState("")
  const [googleLoadError, setGoogleLoadError] = React.useState(false)
  const [selectedGa4Property, setSelectedGa4Property] = React.useState("")

  // Validation state
  const [errors, setErrors] = React.useState<{
    name?: string
    description?: string
    url?: string
  }>({})
  const [showErrors, setShowErrors] = React.useState(false)

  // UTM state
  const [utmOpen, setUtmOpen] = React.useState(false)
  const [utmSource, setUtmSource] = React.useState("dynamic_qr")
  const [utmMedium, setUtmMedium] = React.useState("scan")
  const [syncUtmCampaign, setSyncUtmCampaign] = React.useState(true)
  const [utmCampaign, setUtmCampaign] = React.useState("")

  // Initialize form state when QR data is loaded
  React.useEffect(() => {
    if (qr) {
      setQrName(qr.name || "")
      setQrDescription(qr?.description || "")
      setQrUrl(qr.destination_url || "")
      setQrType(qr.qr_type || "url")
      setTrackingEnabled(qr.ga_type !== 'NO')
      // 'MANUAL' means custom tracking code, 'OAUTH' means Google account, undefined/NO means use campaign
      setTrackingSource(qr.ga_type === 'MANUAL' ? 'custom' : qr.ga_type === 'OAUTH' ? 'google' : 'campaign')
      setCustomTrackingCode(qr.ga_measurement_id || "")
      setSelectedGa4Property(qr.ga_measurement_id || "")
      setUtmSource(qr.utm_source || "dynamic_qr")
      setUtmMedium(qr.utm_medium || "scan")
      setUtmCampaign(qr.utm_campaign || "")
    }
  }, [qr])

  // URL Preview
  const urlPreview = React.useMemo(() => {
    if (!qrUrl) return ""
    try {
      const url = new URL(qrUrl.startsWith("http") ? qrUrl : `https://${qrUrl}`)
      const params = new URLSearchParams()
      if (utmSource) params.set("utm_source", utmSource)
      if (utmMedium) params.set("utm_medium", utmMedium)
      if (syncUtmCampaign && qrName) params.set("utm_campaign", qrName)
      else if (utmCampaign) params.set("utm_campaign", utmCampaign)
      return `${url.origin}${url.pathname}?${params.toString()}`
    } catch {
      return ""
    }
  }, [qrUrl, utmSource, utmMedium, syncUtmCampaign, qrName, utmCampaign])

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!qrName.trim()) {
      newErrors.name = t("qrcodesPage.validation.qrNameRequired")
    } else if (qrName.trim().length < 3) {
      newErrors.name = t("qrcodesPage.validation.qrNameMin")
    }

    if (qrDescription.trim().length > 255) {
      newErrors.description = t("qrcodesPage.validation.descriptionMax")
    }

    if (!qrUrl.trim()) {
      newErrors.url = t("qrcodesPage.validation.destinationUrlRequired")
    } else {
      try {
        new URL(qrUrl.startsWith("http") ? qrUrl : `https://${qrUrl}`)
      } catch {
        newErrors.url = t("qrcodesPage.validation.validUrl")
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveQr = () => {
    setShowErrors(true)

    if (!validateForm()) {
      return
    }

    const updatePayload = {
      qrId,
      name: qrName.trim(),
      description: qrDescription.trim() || undefined,
      destination_url: qrUrl.trim(),
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: syncUtmCampaign ? qrName : utmCampaign || undefined,
      ga_type: trackingSource === 'custom' ? 'MANUAL' : trackingSource === 'google' ? 'OAUTH' : trackingEnabled ? undefined : 'NO',
      ga_measurement_id: trackingSource === 'custom' ? customTrackingCode.trim() || undefined : trackingSource === 'google' ? selectedGa4Property || undefined : undefined,
    } as any

    updateQRMutation.mutate(updatePayload)
  }

  const handleConnectGoogle = () => {
    router.push("/dashboard/integrations/setup")
  }

  const isFormValid = qrName && qrUrl

  // Loading state
  if (qrQuery.isLoading || campaignsQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-[#04AA6DFF]" />
        <p className="text-sm text-muted-foreground">{t("qrcodesPage.loadingQrCodeData")}</p>
      </div>
    )
  }

  // Error state
  if (qrQuery.isError) {
    const status = (qrQuery.error as { status?: number } | null)?.status
    const message =
      status === 403
        ? t("qrcodesPage.editLoadErrorForbidden")
        : status === 401
          ? t("qrcodesPage.editLoadErrorInvalidSession")
          : t("qrcodesPage.editLoadError")

    return (
      <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p className="text-sm text-destructive">{message}</p>
        <Link
          href="/dashboard/qr"
          className="inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground"
        >
          {t("qrcodesPage.backToQRCodes")}
        </Link>
      </div>
    )
  }

  // Show not found state
  if (!qr) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/qr">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("qrcodesPage.editQRCodeTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("qrcodesPage.qrCodeNotFound")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/qr">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("qrcodesPage.editQRCodeTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("qrcodesPage.editQRCodeSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form - Left Column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Campaign Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("qrcodesPage.campaignInfo")}</CardTitle>
              <CardDescription>{t("qrcodesPage.campaignInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="font-medium">{selectedCampaign?.name || t("qrcodesPage.noCampaignSelected")}</p>
                  <p className="text-xs text-muted-foreground">{campaignId}</p>
                </div>
                <Badge
                  className={
                    selectedCampaign?.status === "active"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                      : selectedCampaign?.status === "paused"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                        : selectedCampaign?.status === "draft"
                          ? "border-gray-500/50 bg-gray-500/10 text-gray-500"
                          : "border-blue-500/50 bg-blue-500/10 text-blue-500"
                  }
                >
                  {(selectedCampaign?.status || 'active').toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("qrcodesPage.qrCodeDetails")}</CardTitle>
              <CardDescription>{t("qrcodesPage.configureBasicInfo")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-name">{t("qrcodesPage.qrCodeNameLabel")} *</Label>
                <Input
                  id="qr-name"
                  placeholder={t("qrcodesPage.qrNamePlaceholder")}
                  value={qrName}
                  onChange={(e) => {
                    setQrName(e.target.value)
                    if (showErrors) setErrors(prev => ({ ...prev, name: undefined }))
                  }}
                  className={showErrors && errors.name ? "border-destructive" : ""}
                />
                {showErrors && errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("qrcodesPage.descriptionLabel")}</Label>
                <textarea
                  id="description"
                  value={qrDescription}
                  onChange={(e) => {
                    setQrDescription(e.target.value)
                    if (showErrors) setErrors((prev) => ({ ...prev, description: undefined }))
                  }}
                  placeholder={t("qrcodesPage.descriptionPlaceholder")}
                  className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
                {showErrors && errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-url">{t("qrcodesPage.destinationUrlLabel")} *</Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="qr-url"
                    placeholder={t("qrcodesPage.urlPlaceholder")}
                    value={qrUrl}
                    onChange={(e) => {
                      setQrUrl(e.target.value)
                      if (showErrors) setErrors(prev => ({ ...prev, url: undefined }))
                    }}
                    className={`pl-10 ${showErrors && errors.url ? "border-destructive" : ""}`}
                  />
                </div>
                {showErrors && errors.url && (
                  <p className="text-sm text-destructive">{errors.url}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-type">{t("qrcodesPage.qrType")}</Label>
                <Select value={qrType} onValueChange={setQrType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">{t("qrcodesPage.staticUrl")}</SelectItem>
                    <SelectItem value="dynamic">{t("qrcodesPage.dynamicQr")}</SelectItem>
                    <SelectItem value="vcard">{t("qrcodesPage.vcard")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("qrcodesPage.trackingAnalytics")}</CardTitle>
              <CardDescription>{t("qrcodesPage.configureAnalyticsAndTracking")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GA4 Tracking */}
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t("qrcodesPage.ga4Tracking")}</Label>
                  {selectedCampaign?.gaMeasurementId ? (
                    <Badge variant="secondary" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500">
                      {t("qrcodesPage.campaignGa4Configured")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-amber-500">
                      {t("qrcodesPage.campaignGa4NotConfigured")}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tracking-enabled"
                    checked={trackingEnabled}
                    onCheckedChange={(checked) => setTrackingEnabled(checked as boolean)}
                  />
                  <Label htmlFor="tracking-enabled">{t("qrcodesPage.enableTracking")}</Label>
                </div>

                {trackingEnabled && (
                  <RadioGroup
                    value={trackingSource}
                    onValueChange={setTrackingSource}
                    className="space-y-4"
                  >
                    {/* Option 1: Use Campaign Tracking Code */}
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="campaign" id="tracking-campaign" className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="tracking-campaign" className="font-medium">{t("qrcodesPage.useCampaignTrackingCode")}</Label>
                        {trackingSource === "campaign" && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <span className="font-mono text-sm">
                              {selectedCampaign?.gaMeasurementId || t("qrcodesPage.noTrackingCodeConfigured")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Option 2: Use Custom Tracking Code */}
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="custom" id="tracking-custom" className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="tracking-custom" className="font-medium">{t("qrcodesPage.useCustomTrackingCode")}</Label>
                        {trackingSource === "custom" && (
                          <Input
                            placeholder={t("qrcodesPage.enterGa4MeasurementId")}
                            value={customTrackingCode}
                            onChange={(e) => setCustomTrackingCode(e.target.value)}
                            className="max-w-md"
                          />
                        )}
                      </div>
                    </div>

                    {/* Option 3: Use Tracking Code from Google Account */}
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="google" id="tracking-google" className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="tracking-google" className="flex items-center gap-2 font-medium">
                          {t("qrcodesPage.useTrackingCodeFromGoogleAccount")}
                          <Badge variant="secondary" className="text-xs">{t("qrcodesPage.recommended")}</Badge>
                        </Label>
                        {trackingSource === "google" && (
                          <div className="space-y-3 pt-2">
                            {!isGoogleConnected ? (
                              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <AlertCircle className="size-4" />
                                  <span>{t("qrcodesPage.connectGoogleFirstMessage")}</span>
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
                                  {t("qrcodesPage.connectGoogleAccount")}
                                </Button>
                              </div>
                            ) : googleLoadError ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                                  <AlertTriangle className="size-4 text-destructive" />
                                  <span className="text-sm text-destructive">
                                    {t("qrcodesPage.unableToLoadGa4PropertiesReconnect")}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleConnectGoogle}
                                  className="gap-2"
                                >
                                  <RefreshCw className="size-4" />
                                  {t("qrcodesPage.reconnectAccount")}
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-emerald-600">
                                  <Check className="size-4" />
                                  <span>{t("qrcodesPage.googleAccountConnected")}</span>
                                </div>
                                {ga4PropertiesQuery.isLoading ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" />
                                    {t("qrcodesPage.loadingGa4Properties")}
                                  </div>
                                ) : ga4PropertiesQuery.isError ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                                      <AlertTriangle className="size-4 text-destructive" />
                                      <span className="text-sm text-destructive">
                                        {t("qrcodesPage.unableToLoadGa4Properties")}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <Select value={selectedGa4Property} onValueChange={setSelectedGa4Property}>
                                    <SelectTrigger className="max-w-md">
                                      <SelectValue placeholder={t("qrcodesPage.selectGa4Property")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ga4PropertiesQuery.data?.properties?.filter((p: GA4Property) => p.ga_measurement_id && p.ga_measurement_id.trim() !== '').map((property: GA4Property) => (
                                        <SelectItem key={property.ga_measurement_id} value={property.ga_measurement_id!}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{property.ga_measurement_id}</span>
                                            {property.display_name && <span className="text-xs text-muted-foreground">{property.display_name}</span>}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </RadioGroup>
                )}
              </div>

              {/* UTM Parameters */}
              <Collapsible open={utmOpen} onOpenChange={setUtmOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex w-full justify-between px-0">
                    <span className="font-medium">{t("qrcodesPage.utmSettings")}</span>
                    <ChevronDown className={`size-4 transition-transform ${utmOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="utm-source">{t("qrcodesPage.utmSource")}</Label>
                      <Input
                        id="utm-source"
                        value={utmSource}
                        onChange={(e) => setUtmSource(e.target.value)}
                        placeholder="dynamic_qr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="utm-medium">{t("qrcodesPage.utmMedium")}</Label>
                      <Input
                        id="utm-medium"
                        value={utmMedium}
                        onChange={(e) => setUtmMedium(e.target.value)}
                        placeholder="scan"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-utm"
                      checked={syncUtmCampaign}
                      onCheckedChange={(checked) => setSyncUtmCampaign(checked as boolean)}
                    />
                    <Label htmlFor="sync-utm">{t("qrcodesPage.syncUtmCampaign")}</Label>
                  </div>
                  {!syncUtmCampaign && (
                    <div className="space-y-2">
                      <Label htmlFor="utm-campaign">{t("qrcodesPage.utmCampaign")}</Label>
                      <Input
                        id="utm-campaign"
                        value={utmCampaign}
                        onChange={(e) => setUtmCampaign(e.target.value)}
                        placeholder={t("qrcodesPage.utmCampaignPlaceholder")}
                      />
                    </div>
                  )}
                  {urlPreview && (
                    <div className="rounded-md border bg-muted/50 p-3">
                      <Label className="text-xs text-muted-foreground">URL Preview</Label>
                      <p className="mt-1 break-all font-mono text-xs">{urlPreview}</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview & Actions (1/3) */}
        <div className="space-y-6">
          {/* QR Code Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("common.preview")}</CardTitle>
              <CardDescription>{t("qrcodesPage.previewDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex size-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <QrCode className="size-24 text-muted-foreground" />
                </div>
                {qrName && (
                  <p className="text-center text-sm font-medium">{qrName}</p>
                )}
                {qrUrl && (
                  <p className="max-w-full truncate text-center text-xs text-muted-foreground">
                    {qrUrl}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("qrcodesPage.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("qrcodesPage.campaign")}</span>
                <span className="font-medium">
                  {selectedCampaign?.name || t("qrcodesPage.noCampaignSelected")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("qrcodesPage.qrCodeNameLabel")}</span>
                <span className="font-medium">{qrName || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("qrcodesPage.type")}</span>
                <span className="font-medium capitalize">{qrType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("qrcodesPage.tracking")}</span>
                <Badge
                  variant="outline"
                  className={trackingEnabled ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : ""}
                >
                  {trackingEnabled ? t("common.enabled") : t("common.disabled")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleSaveQr}
              disabled={!isFormValid || updateQRMutation.isPending}
            >
              {updateQRMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              {updateQRMutation.isPending ? t("qrcodesPage.saving") : t("qrcodesPage.saveQrCode")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              asChild
            >
              <Link href="/dashboard/qr">
                {t("common.cancel")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
