"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// --- LOGIC API & STATE TỪ PROJECT CỦA BẠN ---
import { createQR } from '@/apis/qr-api'
import { getCampaignById, getCampaigns } from '@/apis/campaigns-api'
import { getGA4Properties } from '@/apis/ga4-api'
import { queryKeys, staleTimes } from '@/lib/cache/query-client'
import { useIntegrationContext } from '@/state/integration-context'
import { useLanguage } from "@/contexts/language-context"
import {
  buildGAModePayload,
  isValidManualMeasurementId,
  shouldEnableGA4PropertiesQuery,
  type GA4Mode
} from '@/modules/ga4/ga4-mode'

import {
  QrCode,
  Link2,
  ChevronDown,
  AlertCircle,
  Plus,
  Megaphone,
  RefreshCw,
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
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { toast } from "sonner"

// --- VALIDATION SCHEMA ---
const createQRSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(3, t("qrcodesPage.validation.qrNameMin")),
  description: z.string().max(255, t("qrcodesPage.validation.descriptionMax")).optional().or(z.literal('')),
  campaignId: z.string().min(1, t("qrcodesPage.validation.selectCampaign")),
  destination_url: z.string().url(t("qrcodesPage.validation.validUrl")),
  qr_type: z.enum(['url', 'event']),
  ga_measurement_id: z.string().optional().or(z.literal('')),
  utm_source: z.string().optional().or(z.literal('')),
  utm_medium: z.string().optional().or(z.literal('')),
  utm_campaign: z.string().optional().or(z.literal('')),
});

type CreateQRFormData = z.infer<ReturnType<typeof createQRSchema>>;

export default function CreateQRCodePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { isGoogleConnected, hasAnalyticsScope } = useIntegrationContext()
  const initialCampaignId = searchParams.get('campaignId') || ''
  const returnTo = searchParams.get('returnTo') || ''
  const hasAppliedInitialCampaignRef = React.useRef(false)

  // --- STATE QUẢN LÝ RIÊNG (UI/UX) ---
  const [ga4Mode, setGa4Mode] = useState<GA4Mode>('NO')
  const [selectedGA4PropertyId, setSelectedGA4PropertyId] = useState<string>('')
  const [utmOpen, setUtmOpen] = useState(false)
  const [syncUtmCampaign, setSyncUtmCampaign] = useState(true)

  // --- REACT HOOK FORM ---
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
    setError,
  } = useForm<CreateQRFormData>({
    resolver: zodResolver(createQRSchema(t)),
    defaultValues: {
      qr_type: 'url',
      utm_source: 'dynamic_qr',
      utm_medium: 'scan',
    },
  })

  const watchedUrl = watch('destination_url')
  const watchedName = watch('name')
  const watchedUtmSource = watch('utm_source')
  const watchedUtmMedium = watch('utm_medium')
  const watchedUtmCampaign = watch('utm_campaign')

  // --- QUERIES DỮ LIỆU THỰC TẾ ---
  const { data: campaignsResponse, isLoading: campaignsLoading } = useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: () => getCampaigns(),
    staleTime: staleTimes.campaigns,
  })

  const campaignDetailQuery = useQuery({
    queryKey: queryKeys.campaigns.detail(initialCampaignId),
    queryFn: () => getCampaignById({ campaignId: initialCampaignId }),
    enabled: Boolean(initialCampaignId),
    staleTime: staleTimes.campaigns,
  })

  const ga4PropertiesQuery = useQuery({
    queryKey: [...queryKeys.integrations.all, 'ga4-properties'],
    queryFn: () => getGA4Properties(),
    enabled: shouldEnableGA4PropertiesQuery({ isGoogleConnected, hasAnalyticsScope }),
  })

  const campaigns = campaignsResponse?.campaigns || []
  const selectedCampaignId = watch('campaignId')
  const selectedCampaign =
    campaigns.find(c => String(c.id) === selectedCampaignId) ||
    (String(campaignDetailQuery.data?.id ?? '') === selectedCampaignId ? campaignDetailQuery.data : undefined)

  React.useEffect(() => {
    if (!initialCampaignId || hasAppliedInitialCampaignRef.current) {
      return
    }

    const existsInList = campaigns.some((campaign) => String(campaign.id) === initialCampaignId)
    const existsInDetail = String(campaignDetailQuery.data?.id ?? '') === initialCampaignId

    if (!campaignsLoading && (existsInList || existsInDetail)) {
      setValue('campaignId', initialCampaignId, { shouldDirty: true, shouldValidate: true })
      hasAppliedInitialCampaignRef.current = true
    }
  }, [campaignDetailQuery.data?.id, campaigns, campaignsLoading, initialCampaignId, setValue])

  // --- GA4 DETECTION LOGIC ---
  const detectGA4Mutation = useMutation({
    mutationFn: async (_url: string) => {
      // Mock detection - replace with actual API call when available
      return { ga_measurement_id: null as string | null, measurement_ids: [] as string[] }
    },
    onSuccess: (result: { ga_measurement_id: string | null; measurement_ids: string[] }) => {
      const detectedId = result.ga_measurement_id || result.measurement_ids?.[0]
      if (detectedId) {
        setValue('ga_measurement_id', detectedId, { shouldValidate: true })
        toast.success(t("qrcodesPage.ga4Detected").replace('{{id}}', detectedId))
      } else {
        toast.error(t("qrcodesPage.noGa4Found"))
      }
    }
  })

  const handleScanFromLink = async () => {
    const url = getValues('destination_url')
    if (!url) return toast.error(t("qrcodesPage.enterUrlFirst"))
    detectGA4Mutation.mutate(url)
  }

  // --- MUTATION TẠO QR ---
  const createQRMutation = useMutation({
    mutationFn: (payload: any) => createQR(payload),
    onSuccess: () => {
      toast.success(t("qrcodesPage.createSuccess"))
      const createdCampaignId = getValues('campaignId')
      const fallbackPath = createdCampaignId ? `/dashboard/campaigns/${createdCampaignId}` : '/dashboard/qr'
      router.push(returnTo.startsWith('/dashboard/') ? returnTo : fallbackPath)
    },
    onError: () => toast.error(t("qrcodesPage.createError"))
  })

  const onSubmit = async (data: CreateQRFormData) => {
    // Logic xử lý GA4 Payload từ WebStorm
    const oauthMeasurementId = ga4PropertiesQuery.data?.properties?.find(p => p.property_id === selectedGA4PropertyId)?.ga_measurement_id

    if (ga4Mode === 'MANUAL' && data.ga_measurement_id && !isValidManualMeasurementId(data.ga_measurement_id)) {
      setError('ga_measurement_id' as const, { message: t("qrcodesPage.invalidGa4Format") })
      return
    }

    const gaPayload = buildGAModePayload({
      mode: ga4Mode,
      selectedPropertyId: selectedGA4PropertyId || undefined,
      manualMeasurementId: data.ga_measurement_id || undefined,
      oauthMeasurementId,
      sourceWhenOAuth: 'qr_override',
      sourceWhenManual: 'manual',
      sourceWhenNo: 'campaign_default',
    })

    const finalPayload = {
      ...data,
      campaign_id: Number(data.campaignId),
      utm_campaign: syncUtmCampaign ? data.name : data.utm_campaign,
      ...(gaPayload || {})
    }

    createQRMutation.mutate(finalPayload)
  }

  // --- PREVIEW LOGIC ---
  const urlPreview = useMemo(() => {
    if (!watchedUrl) return ""
    try {
      const url = new URL(watchedUrl.startsWith("http") ? watchedUrl : `https://${watchedUrl}`)
      if (watchedUtmSource) url.searchParams.set("utm_source", watchedUtmSource)
      if (watchedUtmMedium) url.searchParams.set("utm_medium", watchedUtmMedium)
      url.searchParams.set("utm_campaign", syncUtmCampaign ? (watchedName || "campaign") : (watchedUtmCampaign || "campaign"))
      return url.toString()
    } catch { return "" }
  }, [watchedUrl, watchedUtmSource, watchedUtmMedium, syncUtmCampaign, watchedName, watchedUtmCampaign])

  // --- RENDER EMPTY STATE ---
  if (!campaignsLoading && campaigns.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <Megaphone className="size-8 text-muted-foreground" />
            </div>
            <CardTitle>{t("qrcodesPage.noCampaigns")}</CardTitle>
            <CardDescription>
              {t("qrcodesPage.mustCreateCampaign")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-[#04AA6DFF] hover:bg-[#038e5b]">
              <Link href="/campaigns/create">
                <Plus className="mr-2 size-4" /> {t("campaignsPage.createCampaign")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("qrcodesPage.createQRCode")}</h1>
            <p className="text-sm text-muted-foreground">{t("qrcodesPage.subtitle")}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form - Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Campaign Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("qrcodesPage.selectCampaign")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="campaignId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.campaignId ? "border-destructive" : ""}>
                        <SelectValue placeholder={t("qrcodesPage.selectCampaignPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignDetailQuery.data &&
                          !campaigns.some((campaign) => String(campaign.id) === String(campaignDetailQuery.data?.id)) && (
                            <SelectItem value={String(campaignDetailQuery.data.id)}>
                              <div className="flex items-center gap-2">
                                <span>{campaignDetailQuery.data.name}</span>
                                <Badge variant="outline" className="text-[10px] uppercase">{campaignDetailQuery.data.status}</Badge>
                              </div>
                            </SelectItem>
                          )}
                        {campaigns.filter((c) => c.id && String(c.id).trim() !== '').map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            <div className="flex items-center gap-2">
                              <span>{c.name}</span>
                              <Badge variant="outline" className="text-[10px] uppercase">{c.status}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.campaignId && <p className="mt-2 text-xs text-destructive">{errors.campaignId.message}</p>}
              </CardContent>
            </Card>

            {/* QR Code Details */}
            <Card className={!selectedCampaignId ? "opacity-50 pointer-events-none" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">{t("qrcodesPage.qrCodeDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-name">{t("qrcodesPage.qrCodeNameLabel")} *</Label>
                  <Input
                    {...register('name')}
                    placeholder={t("qrcodesPage.qrNamePlaceholder")}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("qrcodesPage.descriptionLabel")}</Label>
                  <textarea
                    id="description"
                    {...register('description')}
                    placeholder={t("qrcodesPage.descriptionPlaceholder")}
                    className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-url">{t("qrcodesPage.destinationUrlLabel")} *</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...register('destination_url')}
                      placeholder={t("qrcodesPage.urlPlaceholder")}
                      className={`pl-10 ${errors.destination_url ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.destination_url && <p className="text-xs text-destructive">{errors.destination_url.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>{t("qrcodesPage.qrType")}</Label>
                  <Controller
                    name="qr_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">{t("qrcodesPage.staticUrl")}</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tracking Settings - GA4 Logic from WebStorm */}
            <Card className={!selectedCampaignId ? "opacity-50 pointer-events-none" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">{t("qrcodesPage.trackingAnalytics")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4 bg-card">
                  <RadioGroup value={ga4Mode} onValueChange={(v) => setGa4Mode(v as GA4Mode)}>
                    {/* Option: Campaign Default */}
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="NO" id="ga-no" className="mt-1" />
                      <div className="grid gap-1.5">
                        <Label htmlFor="ga-no" className="font-medium">{t("qrcodesPage.useCampaignDefault")}</Label>
                        <p className="text-xs text-muted-foreground">{t("qrcodesPage.trackingInherited")} "{selectedCampaign?.name || t("campaigns.title")}"</p>
                      </div>
                    </div>

                    {/* Option: Manual */}
                    <div className="flex items-start space-x-3 pt-2">
                      <RadioGroupItem value="MANUAL" id="ga-manual" className="mt-1" />
                      <div className="grid gap-2 w-full">
                        <Label htmlFor="ga-manual" className="font-medium">{t("qrcodesPage.manualEntry")}</Label>
                        {ga4Mode === 'MANUAL' && (
                          <div className="flex gap-2">
                            <Input {...register('ga_measurement_id')} placeholder="G-XXXXXXXXXX" className="max-w-[200px]" />
                            <Button type="button" variant="outline" size="sm" onClick={handleScanFromLink} disabled={detectGA4Mutation.isPending}>
                              {detectGA4Mutation.isPending ? <Loader2 className="animate-spin size-4" /> : <RefreshCw className="size-4" />}
                              <span className="ml-2">{t("qrcodesPage.autoDetect")}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Option: OAUTH */}
                    <div className="flex items-start space-x-3 pt-2">
                      <RadioGroupItem value="OAUTH" id="ga-oauth" className="mt-1" />
                      <div className="grid gap-2 w-full">
                        <Label htmlFor="ga-oauth" className="font-medium flex items-center gap-2">
                          {t("qrcodesPage.linkedGoogleAccount")} <Badge variant="secondary">{t("common.pro")}</Badge>
                        </Label>
                        {ga4Mode === 'OAUTH' && (
                          <div className="space-y-2">
                            {!isGoogleConnected ? (
                              <Alert className="py-2 border-yellow-500/50 bg-yellow-500/10">
                                <AlertCircle className="size-4" />
                                <AlertDescription className="text-xs">{t("qrcodesPage.connectGoogleFirst")} <Link href="/integrations" className="underline">{t("nav.ggServices")}</Link>.</AlertDescription>
                              </Alert>
                            ) : (
                              <Select value={selectedGA4PropertyId} onValueChange={setSelectedGA4PropertyId}>
                                <SelectTrigger className="max-w-md">
                                  <SelectValue placeholder={t("qrcodesPage.selectGa4Property")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {ga4PropertiesQuery.data?.properties?.filter((p) => (p.ga_measurement_id && p.ga_measurement_id.trim() !== '') || (p.property_id && p.property_id.trim() !== '')).map((p) => {
                                    const value = (p.ga_measurement_id && p.ga_measurement_id.trim() !== '') ? p.ga_measurement_id : p.property_id;
                                    return (
                                      <SelectItem key={value} value={value!}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{value}</span>
                                          {p.display_name && <span className="text-xs text-muted-foreground">{p.display_name}</span>}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* UTM Section */}
                <Collapsible open={utmOpen} onOpenChange={setUtmOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0">
                      <span className="font-medium">{t("qrcodesPage.utmSettings")}</span>
                      <ChevronDown className={`size-4 transition-transform ${utmOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("qrcodesPage.utmSource")}</Label>
                        <Input {...register('utm_source')} placeholder="dynamic_qr" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("qrcodesPage.utmMedium")}</Label>
                        <Input {...register('utm_medium')} placeholder="scan" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="sync-utm" checked={syncUtmCampaign} onCheckedChange={(v) => setSyncUtmCampaign(v as boolean)} />
                      <Label htmlFor="sync-utm" className="text-xs">{t("qrcodesPage.syncUtmCampaign")}</Label>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">{t("common.preview")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="flex size-48 items-center justify-center rounded-xl border-2 border-dashed bg-muted/50">
                  <QrCode className="size-24 text-muted-foreground/40" />
                </div>
                {watchedName && <p className="font-semibold text-center">{watchedName}</p>}
                {urlPreview && (
                  <div className="w-full rounded-md bg-muted/30 p-2 text-[10px] font-mono break-all text-muted-foreground">
                    {urlPreview}
                  </div>
                )}
              </CardContent>
              <CardContent className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("qrcodesPage.campaign")}</span>
                  <span className="font-medium text-primary">{selectedCampaign?.name || "---"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("qrcodesPage.tracking")}</span>
                  <Badge variant="secondary" className={ga4Mode !== 'NO' ? "bg-emerald-500/10 text-emerald-500" : ""}>
                    {ga4Mode === 'NO' ? t("qrcodesPage.default") : ga4Mode}
                  </Badge>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#04AA6DFF] hover:bg-[#038e5b]"
                  disabled={!selectedCampaignId || createQRMutation.isPending}
                >
                  {createQRMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <QrCode className="mr-2 size-4" />}
                  {t("qrcodesPage.createQRCode")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </TooltipProvider>
  )
}
