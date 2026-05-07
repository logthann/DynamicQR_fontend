"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Scan,
  Users,
  TrendingUp,
  Activity,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ArrowUpDown,
  Loader2,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { useLanguage } from "@/contexts/language-context"
import { getDashboardOverview } from "@/apis/dashboard-api"
import { sessionSyncIntegrations, startIntegrationConnect } from "@/apis/integrations-api"
import { getGoogleOAuthRedirectUri } from "@/lib/integrations/google-oauth"
import { getAuthToken } from "@/apis/auth-fetch"
import { cacheInvalidations, queryKeys, staleTimes } from "@/lib/cache/query-client"

const OAUTH_RETURN_PATH_KEY = "dqr:oauth-return-path"
const SESSION_SYNC_DONE_KEY = "dqr:integrations-session-sync-done"
const SESSION_SYNC_REAUTH_KEY = "dqr:integrations-session-sync-reauth"

interface KPIData {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface ChartDataItem {
  name: string
  value: number
  fill: string
}

const barChartConfig = {
  scans: {
    label: "Scans",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const pieChartConfig = {
  value: {
    label: "Traffic %",
  },
} satisfies ChartConfig

const chartTooltipContent = (props: React.ComponentProps<typeof ChartTooltipContent>) => (
  <ChartTooltipContent {...props} />
)

interface CampaignTableItem {
  id: string
  name: string
  status: string
  totalScans: number
  uniqueUsers: number
  createdAt: string
}

const allCampaignsData: CampaignTableItem[] = []

export default function GlobalOverviewPage() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof CampaignTableItem | null
    direction: "asc" | "desc"
  }>({ key: "totalScans", direction: "desc" })

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [requiresReauth, setRequiresReauth] = React.useState(false)
  const [reauthProvider, setReauthProvider] = React.useState<"google_calendar" | "google_analytics">("google_calendar")
  const [reauthMessage, setReauthMessage] = React.useState<string | null>(null)
  const sessionSyncTriggeredRef = React.useRef(false)

  // Fetch dashboard overview data
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: () => getDashboardOverview(),
    staleTime: staleTimes.dashboard,
  })

  // Transform campaigns data from dashboard overview API
  const campaignsData: CampaignTableItem[] = React.useMemo(() => {
    const campaigns = dashboardQuery.data?.campaigns?.items as Array<{
      campaign_id: string
      campaign_name: string
      status: string
      scans: number
      unique_users: number
    }> || []
    return campaigns.map((campaign) => ({
      id: campaign.campaign_id,
      name: campaign.campaign_name,
      status: campaign.status || "active",
      totalScans: campaign.scans || 0,
      uniqueUsers: campaign.unique_users || 0,
      createdAt: "",
    }))
  }, [dashboardQuery.data])

  // Build KPI data from API response
  const globalKpiData: KPIData[] = React.useMemo(() => {
    const kpis = dashboardQuery.data?.kpis as Record<string, Record<string, unknown>> || {}
    const totalScans = kpis.total_scans || {}
    const activeCampaigns = kpis.active_campaigns || {}
    const totalUniqueUsers = kpis.total_unique_users || {}
    const systemGrowth = kpis.system_growth || {}

    return [
      {
        title: "Total Scans",
        value: String(totalScans.value ?? "0"),
        change: `${totalScans.change_pct ?? 0}%`,
        trend: (totalScans.trend as "up" | "down") || "up",
        icon: Scan,
        description: "All campaigns combined"
      },
      {
        title: "Active Campaigns",
        value: String(activeCampaigns.value ?? campaignsData.filter(c => c.status === "active").length ?? "0"),
        change: `+${activeCampaigns.change_abs ?? 0}`,
        trend: (activeCampaigns.trend as "up" | "down") || "up",
        icon: Activity,
        description: "Currently running"
      },
      {
        title: "Total Unique Users",
        value: String(totalUniqueUsers.value ?? "0"),
        change: `${totalUniqueUsers.change_pct ?? 0}%`,
        trend: (totalUniqueUsers.trend as "up" | "down") || "up",
        icon: Users,
        description: "Across all campaigns"
      },
      {
        title: "System Growth",
        value: `${systemGrowth.value ?? 0}%`,
        change: `${systemGrowth.change_pct ?? 0}%`,
        trend: (systemGrowth.trend as "up" | "down") || "up",
        icon: TrendingUp,
        description: "Month over month"
      },
    ]
  }, [dashboardQuery.data, campaignsData])

  // Build chart data from API response
  const scansPerCampaignData: ChartDataItem[] = React.useMemo(() => {
    const scansPerCampaign = dashboardQuery.data?.charts?.scans_per_campaign as Array<{campaign_name: string, scans: number}> ||
       campaignsData.slice(0, 5).map((c, i) => ({
         campaign_name: c.name,
         scans: c.totalScans,
         fill: ["var(--primary)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"][i % 5]
       }))
    return scansPerCampaign.map((item, i) => ({
      name: item.campaign_name,
      value: item.scans,
      fill: ["var(--primary)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"][i % 5]
    }))
  }, [dashboardQuery.data, campaignsData])

  const trafficDistributionData: ChartDataItem[] = React.useMemo(() => {
    const trafficDistribution = dashboardQuery.data?.charts?.traffic_distribution as Array<{campaign_name: string, traffic_share_pct: number}> ||
                     campaignsData.slice(0, 5).map((c, i) => ({
                       campaign_name: c.name,
                       traffic_share_pct: 0
                     }))
    return trafficDistribution.map((item, i) => ({
      name: item.campaign_name,
      value: Math.round(item.traffic_share_pct) || 0,
      fill: ["var(--primary)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"][i % 5]
    }))
  }, [dashboardQuery.data, campaignsData])

  // Filter and sort campaigns
  const filteredCampaigns = React.useMemo(() => {
    let filtered = campaignsData.filter(campaign =>
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!]
        const bValue = b[sortConfig.key!]

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }

        return 0
      })
    }

    return filtered
  }, [campaignsData, searchQuery, sortConfig])

  // Paginated data
  const paginatedCampaigns = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredCampaigns.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredCampaigns, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredCampaigns.length / rowsPerPage)

  const handleSort = (key: keyof CampaignTableItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }))
  }

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows)
    setCurrentPage(1)
  }

  const isLoading = dashboardQuery.isLoading
  const isError = dashboardQuery.isError

  const reconnectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = getGoogleOAuthRedirectUri()
      return startIntegrationConnect({ provider: reauthProvider, redirectUri })
    },
    onSuccess: (result) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, "/dashboard")
        window.location.assign(result.authorizationUrl)
      }
    },
  })

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const persistedReauth = window.sessionStorage.getItem(SESSION_SYNC_REAUTH_KEY)
    if (!persistedReauth) {
      return
    }

    try {
      const parsed = JSON.parse(persistedReauth) as { provider?: string; message?: string }
      const provider = parsed.provider === "google_analytics" ? "google_analytics" : "google_calendar"
      setRequiresReauth(true)
      setReauthProvider(provider)
      setReauthMessage(typeof parsed.message === "string" ? parsed.message : "Google connection requires re-authentication.")
    } catch {
      window.sessionStorage.removeItem(SESSION_SYNC_REAUTH_KEY)
    }
  }, [])

  React.useEffect(() => {
    if (sessionSyncTriggeredRef.current || isLoading || isError) {
      return
    }

    if (typeof window !== "undefined" && window.sessionStorage.getItem(SESSION_SYNC_DONE_KEY) === "1") {
      sessionSyncTriggeredRef.current = true
      return
    }

    if (!getAuthToken()) {
      return
    }

    sessionSyncTriggeredRef.current = true

    void (async () => {
      try {
        const syncResult = await sessionSyncIntegrations()
        cacheInvalidations.refreshIntegrationProvider()

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(SESSION_SYNC_DONE_KEY, "1")
        }

        const providerNeedingReauth = syncResult.providers.find((provider) => provider.requiresReauth)
        if (providerNeedingReauth) {
          setRequiresReauth(true)
          setReauthProvider(providerNeedingReauth.provider === "google_analytics" ? "google_analytics" : "google_calendar")
          setReauthMessage(providerNeedingReauth.message ?? "Google connection requires re-authentication.")
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              SESSION_SYNC_REAUTH_KEY,
              JSON.stringify({
                provider: providerNeedingReauth.provider,
                message: providerNeedingReauth.message ?? "Google connection requires re-authentication.",
              })
            )
          }
        } else {
          setRequiresReauth(false)
          setReauthMessage(null)
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(SESSION_SYNC_REAUTH_KEY)
          }
        }
      } catch {
        // Keep this fully silent; dashboard render should never be blocked by session-sync failures.
      }
    })()
  }, [isError, isLoading])

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("overview.title")}</h1>
        <p className="text-muted-foreground">
          {t("overview.subtitle")}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading dashboard data...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
          <p className="text-sm text-destructive">
            Failed to load dashboard data. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Background session-sync requires re-auth only when backend flags it */}
      {!isLoading && !isError && requiresReauth && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-amber-600">Google reconnect required</p>
              <p className="text-sm text-muted-foreground">
                {reauthMessage ?? "Your Google session needs to be reconnected to continue syncing integrations."}
              </p>
            </div>
            <Button onClick={() => reconnectMutation.mutate()} disabled={reconnectMutation.isPending}>
              {reconnectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                "Reconnect"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!isLoading && !isError && (
        <>
          {/* Global KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {globalKpiData.map((kpi) => (
              <Card key={kpi.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <kpi.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="flex items-center gap-1 text-xs">
                    {kpi.trend === "up" ? (
                      <ArrowUpRight className="size-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="size-3 text-red-500" />
                    )}
                    <span className={kpi.trend === "up" ? "text-emerald-500" : "text-red-500"}>
                      {kpi.change}
                    </span>
                    <span className="text-muted-foreground">{t("overview.vsLastPeriod")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar Chart - Scans per Campaign */}
            <Card>
              <CardHeader>
                <CardTitle>{t("overview.scansPerCampaign")}</CardTitle>
                <CardDescription>{t("overview.topPerforming")}</CardDescription>
              </CardHeader>
              <CardContent>
                {scansPerCampaignData.length > 0 ? (
                  <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scansPerCampaignData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip
                          content={ChartTooltipContent}
                          formatter={(value) => [`${Number(value).toLocaleString()} scans`, "Total"]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {scansPerCampaignData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No scan data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart - Traffic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("overview.trafficDistribution")}</CardTitle>
                <CardDescription>{t("overview.trafficPercentage")}</CardDescription>
              </CardHeader>
              <CardContent>
                {trafficDistributionData.length > 0 ? (
                  <ChartContainer config={pieChartConfig} className="mx-auto h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trafficDistributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={2}
                          label={({ name, value }) => `${value}%`}
                          labelLine={false}
                        >
                          {trafficDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={chartTooltipContent}
                          formatter={(value) => [`${value}%`, "Traffic Share"]}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No traffic data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("overview.allCampaigns")}</CardTitle>
              <CardDescription>{t("overview.allCampaignsDesc")}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("overview.searchCampaigns")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      {t("overview.campaignName")}
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead
                    className="cursor-pointer text-right hover:bg-muted/50"
                    onClick={() => handleSort("totalScans")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t("overview.totalScansCol")}
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right hover:bg-muted/50"
                    onClick={() => handleSort("uniqueUsers")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t("overview.uniqueUsers")}
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {t("overview.noCampaignsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCampaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="group">
                      <TableCell>
                        <Link
                          href={`/dashboard/campaigns/${campaign.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            campaign.status === "active"
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                              : campaign.status === "paused"
                                ? "border-amber-500/50 bg-amber-500/10 text-amber-600"
                                : campaign.status === "completed"
                                  ? "border-blue-500/50 bg-blue-500/10 text-blue-600"
                                  : "border-muted-foreground/50 bg-muted text-muted-foreground"
                          }
                        >
                          {campaign.status === "active"
                            ? t("common.active")
                            : campaign.status === "paused"
                              ? t("common.paused") || "Paused"
                              : campaign.status === "completed"
                                ? t("common.completed") || "Completed"
                                : t("common.planned") || "Planned"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {campaign.totalScans.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.uniqueUsers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Link href={`/dashboard/campaigns/${campaign.id}`}>
                            <Eye className="mr-1 size-3" />
                            {t("overview.seeAnalytics")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCampaigns.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}
