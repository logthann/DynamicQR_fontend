"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  CheckCircle2,
  XCircle,
  Settings,
  RefreshCw,
  Unplug,
  Calendar,
  BarChart3,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "@/components/ui/alert-dialog"
import { getIntegrations, startIntegrationConnect, disconnectIntegration } from "@/apis/integrations-api"
import { getGoogleOAuthRedirectUri } from "@/lib/integrations/google-oauth"
import type { IntegrationStatus, IntegrationProvider } from "@/apis/generated/types"
import { useLanguage } from "@/contexts/language-context"

const OAUTH_RETURN_PATH_KEY = "dqr:oauth-return-path"

type ConnectionStatus = "connected" | "disconnected" | "error"

interface GoogleServiceDisplay {
  id: IntegrationProvider
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: ConnectionStatus
  lastSync?: string
  accountEmail?: string
}

const SERVICE_CONFIG: Record<IntegrationProvider, Omit<GoogleServiceDisplay, "status" | "lastSync" | "accountEmail">> = {
  google_calendar: {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync events and schedules with Google Calendar",
    icon: Calendar,
  },
  google_analytics: {
    id: "google_analytics",
    name: "Google Analytics",
    description: "Track and analyze campaign performance metrics",
    icon: BarChart3,
  },
}

function mapIntegrationToDisplay(integration: IntegrationStatus): GoogleServiceDisplay {
  const config = SERVICE_CONFIG[integration.provider]
  return {
    ...config,
    status: integration.connected ? "connected" : "disconnected",
    lastSync: integration.updatedAt,
    accountEmail: integration.accountEmail,
  }
}

function getStatusBadge(status: ConnectionStatus, t: (key: string) => string) {
  switch (status) {
    case "connected":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
        >
          <CheckCircle2 className="mr-1 size-3" />
          {t("integrations.status.connected")}
        </Badge>
      )
    case "disconnected":
      return (
        <Badge
          variant="outline"
          className="border-muted-foreground/50 bg-muted text-muted-foreground"
        >
          <XCircle className="mr-1 size-3" />
          {t("integrations.status.disconnected")}
        </Badge>
      )
    case "error":
      return (
        <Badge
          variant="outline"
          className="border-destructive/50 bg-destructive/10 text-destructive"
        >
          <XCircle className="mr-1 size-3" />
          {t("integrations.status.error")}
        </Badge>
      )
  }
}

function formatLastSync(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function GoogleServicesSetupPage() {
  const { t } = useLanguage()
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null)

  // Fetch real integration data from backend
  const { data: integrationsData, refetch: refetchIntegrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
    staleTime: 60 * 1000, // 1 minute
  })

  // Build services list from backend data
  const services = React.useMemo<GoogleServiceDisplay[]>(() => {
    const integrations = integrationsData?.integrations ?? []

    // Map backend data to display format
    const mappedServices = integrations.map(mapIntegrationToDisplay)

    // Check if google_calendar is connected - if so, both services share the same OAuth token
    const calendarService = mappedServices.find((s) => s.id === "google_calendar")
    const isCalendarConnected = calendarService?.status === "connected"

    // Ensure both services are shown even if not returned by backend
    const allProviders: IntegrationProvider[] = ["google_calendar", "google_analytics"]
    allProviders.forEach((provider) => {
      const existingService = mappedServices.find((s) => s.id === provider)
      if (!existingService) {
        const config = SERVICE_CONFIG[provider]
        // If calendar is connected, both services are connected (shared OAuth token)
        mappedServices.push({
          ...config,
          status: isCalendarConnected ? "connected" : "disconnected",
          accountEmail: calendarService?.accountEmail,
          lastSync: calendarService?.lastSync,
        })
      }
    })

    return mappedServices
  }, [integrationsData])

  // Calculate overall connection status
  const connectedCount = services.filter((s) => s.status === "connected").length
  const totalCount = services.length
  const overallStatus: ConnectionStatus =
    connectedCount === totalCount
      ? "connected"
      : connectedCount === 0
        ? "disconnected"
        : "error"

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = getGoogleOAuthRedirectUri()
      return startIntegrationConnect({
        provider: "google_calendar",
        redirectUri,
      })
    },
    onSuccess: (result) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, "/dashboard/integrations/setup")
        window.location.assign(result.authorizationUrl)
      }
    },
  })

  // Switch account mutation
  const switchAccountMutation = useMutation({
    mutationFn: async () => {
      // Disconnect existing connection - ignore 404 (already disconnected)
      try {
        await disconnectIntegration({ providerName: "google_calendar" })
      } catch (err: any) {
        if (err?.status !== 404) throw err
      }
      const redirectUri = getGoogleOAuthRedirectUri()
      return startIntegrationConnect({
        provider: "google_calendar",
        redirectUri,
      })
    },
    onSuccess: (result) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, "/dashboard/integrations/setup")
        window.location.assign(result.authorizationUrl)
      }
    },
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      // Disconnect both services - ignore 404 errors (already disconnected)
      try {
        await disconnectIntegration({ providerName: "google_calendar" })
      } catch (err: any) {
        if (err?.status !== 404) throw err
      }
      try {
        await disconnectIntegration({ providerName: "google_analytics" })
      } catch (err: any) {
        if (err?.status !== 404) throw err
      }
    },
    onSuccess: () => {
      refetchIntegrations()
      setLoadingAction(null)
    },
  })

  const handleSetup = async () => {
    setLoadingAction("setup")
    connectMutation.mutate()
  }

  const handleSwitchAccount = async () => {
    setLoadingAction("switch")
    switchAccountMutation.mutate()
  }

  const handleDisconnect = async () => {
    setLoadingAction("disconnect")
    disconnectMutation.mutate()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("integrations.setup.title")}</h1>
        <p className="text-muted-foreground">
          {t("integrations.setup.subtitle")}
        </p>
      </div>

      {/* Overall Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("integrations.setup.connectionStatus")}</CardTitle>
              <CardDescription>
                {t("integrations.setup.connectionStatusDesc")}
              </CardDescription>
            </div>
            {getStatusBadge(overallStatus, t)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* Status Summary */}
            <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
              <div
                className={`flex size-12 items-center justify-center rounded-full ${
                  overallStatus === "connected"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : overallStatus === "disconnected"
                      ? "bg-muted text-muted-foreground"
                      : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {overallStatus === "connected" ? (
                  <CheckCircle2 className="size-6" />
                ) : (
                  <XCircle className="size-6" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {overallStatus === "connected"
                    ? t("integrations.status.allConnected")
                    : overallStatus === "disconnected"
                      ? t("integrations.status.noneConnected")
                      : t("integrations.status.partialConnected").replace("{count}", String(connectedCount)).replace("{total}", String(totalCount))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {overallStatus === "connected"
                    ? t("integrations.status.allConnectedDesc")
                    : overallStatus === "disconnected"
                      ? t("integrations.status.noneConnectedDesc")
                      : t("integrations.status.partialConnectedDesc")}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {overallStatus === "connected" ? (
                <Button
                  disabled
                  className="gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  {t("integrations.setup.connectedToGoogle")}
                </Button>
              ) : (
                <Button
                  onClick={handleSetup}
                  disabled={loadingAction !== null || connectMutation.isPending}
                  className="gap-2"
                >
                  {loadingAction === "setup" || connectMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Settings className="size-4" />
                  )}
                  {t("integrations.setup.setup")}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={handleSwitchAccount}
                disabled={loadingAction !== null || connectedCount === 0 || switchAccountMutation.isPending}
                className="gap-2"
              >
                {loadingAction === "switch" || switchAccountMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t("integrations.setup.switchAccount")}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loadingAction !== null || connectedCount === 0 || disconnectMutation.isPending}
                    className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {loadingAction === "disconnect" || disconnectMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Unplug className="size-4" />
                    )}
                    {t("integrations.setup.disconnect")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("integrations.setup.disconnectTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("integrations.setup.disconnectDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("integrations.setup.disconnect")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Services Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("integrations.setup.serviceDetails")}</CardTitle>
          <CardDescription>
            {t("integrations.setup.serviceDetailsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${
                    service.status === "connected"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <service.icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{service.name}</p>
                    {getStatusBadge(service.status, t)}
                  </div>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  {service.accountEmail && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("integrations.setup.account")}: {service.accountEmail}
                    </p>
                  )}
                  {service.lastSync && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("integrations.setup.lastSynced")}: {formatLastSync(service.lastSync)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
