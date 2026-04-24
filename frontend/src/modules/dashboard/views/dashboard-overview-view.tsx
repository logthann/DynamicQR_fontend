"use client"

import * as React from "react"
import Link from "next/link"
import {
  Scan,
  Users,
  TrendingUp,
  Activity,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Search,
  ArrowUpDown,
} from "lucide-react"
import {
  Bar,
  BarChart,
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
import { apiClient } from "@/lib/api/client"
import type { DashboardOverviewResponse } from "@/lib/api/client"

type Trend = "up" | "down" | "neutral"

type DashboardKpi = {
  title: string
  value: string
  change: string
  trend: Trend
  icon: React.ComponentType<{ className?: string }>
  description: string
}

type CampaignRow = {
  id: string
  name: string
  status: "active" | "inactive"
  statusLabel: string
  totalScans: number
  uniqueUsers: number
  createdAt: string
}

type CampaignChartRow = {
  name: string
  scans: number
  fill: string
}

type TrafficShareRow = {
  name: string
  value: number
  fill: string
}

type DashboardMetadata = {
  startDate?: string
  endDate?: string
  comparePrevious?: boolean
  includeInactive?: boolean
  topCampaignsLimit?: number
}

const colorPalette = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const numberFormatter = new Intl.NumberFormat("en-US")

const barChartConfig = {
  scans: {
    label: "Scans",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const toTrend = (value: unknown): Trend => {
  if (value === "up") return "up"
  if (value === "down") return "down"
  return "neutral"
}

const formatKpiChange = (changePct: number) => {
  const absolute = Math.abs(changePct)
  const label = `${absolute.toFixed(1)}%`
  if (changePct > 0) return `+${label}`
  if (changePct < 0) return `-${label}`
  return label
}

const parseKpiMetric = (
  metric: unknown,
  fallbackValue = 0,
): { value: number; changeLabel: string; trend: Trend; description: string } => {
  const payload = (metric ?? {}) as Record<string, unknown>
  const value = toNumber(payload.value, fallbackValue)
  const previousValue = toNumber(payload.previous_value, 0)
  const changePct = toNumber(payload.change_pct, 0)
  const trend = toTrend(payload.trend)

  return {
    value,
    changeLabel: formatKpiChange(changePct),
    trend,
    description: `Previous: ${numberFormatter.format(previousValue)}`,
  }
}

const toCampaignRows = (response: DashboardOverviewResponse): CampaignRow[] => {
  const campaignsBlock = (response.campaigns ?? {}) as Record<string, unknown>
  const items = Array.isArray(campaignsBlock.items) ? campaignsBlock.items : []

  return items.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>
    const statusRaw = String(row.status ?? "inactive").toLowerCase()
    const isActive = statusRaw === "active"

    return {
      id: String(row.id ?? row.campaign_id ?? `campaign-${index}`),
      // SỬA DÒNG DƯỚI ĐÂY: Thêm row.campaign_name vào để dự phòng
      name: String(row.name ?? row.campaign_name ?? row.label ?? "Untitled Campaign"),
      status: isActive ? "active" : "inactive",
      statusLabel: isActive ? "Active" : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1),
      totalScans: toNumber(row.total_scans ?? row.scans, 0),
      uniqueUsers: toNumber(row.unique_users ?? row.uniqueUsers, 0),
      createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    }
  })
}

const toScansChartRows = (response: DashboardOverviewResponse): CampaignChartRow[] => {
  const chartsBlock = (response.charts ?? {}) as Record<string, unknown>
  const rows = Array.isArray(chartsBlock.scans_per_campaign)
    ? chartsBlock.scans_per_campaign
    : []

  return rows.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>
    return {
      name: String(row.name ?? row.campaign_name ?? `Campaign ${index + 1}`),
      scans: toNumber(row.scans, 0),
      fill: colorPalette[index % colorPalette.length],
    }
  })
}

const toTrafficRows = (response: DashboardOverviewResponse): TrafficShareRow[] => {
  const chartsBlock = (response.charts ?? {}) as Record<string, unknown>
  const rows = Array.isArray(chartsBlock.traffic_distribution)
    ? chartsBlock.traffic_distribution
    : []

  return rows.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>
    return {
      name: String(row.name ?? row.campaign_name ?? row.label ?? `Campaign ${index + 1}`),
      value: toNumber(row.traffic_share_pct ?? row.value, 0),
      fill: colorPalette[index % colorPalette.length],
    }
  })
}

const toMetadata = (response: DashboardOverviewResponse): DashboardMetadata => {
  const metadata = (response.metadata ?? {}) as Record<string, unknown>

  return {
    startDate:
      typeof metadata.start_date === "string"
        ? metadata.start_date
        : typeof metadata.startDate === "string"
          ? metadata.startDate
          : undefined,
    endDate:
      typeof metadata.end_date === "string"
        ? metadata.end_date
        : typeof metadata.endDate === "string"
          ? metadata.endDate
          : undefined,
    comparePrevious:
      typeof metadata.compare_previous === "boolean"
        ? metadata.compare_previous
        : typeof metadata.comparePrevious === "boolean"
          ? metadata.comparePrevious
          : undefined,
    includeInactive:
      typeof metadata.include_inactive === "boolean"
        ? metadata.include_inactive
        : typeof metadata.includeInactive === "boolean"
          ? metadata.includeInactive
          : undefined,
    topCampaignsLimit: toNumber(
      metadata.top_campaigns_limit ?? metadata.topCampaignsLimit,
      0,
    ),
  }
}

export default function GlobalOverviewPage() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [campaignRows, setCampaignRows] = React.useState<CampaignRow[]>([])
  const [globalKpiData, setGlobalKpiData] = React.useState<DashboardKpi[]>([])
  const [scansPerCampaignData, setScansPerCampaignData] = React.useState<CampaignChartRow[]>([])
  const [trafficDistributionData, setTrafficDistributionData] = React.useState<TrafficShareRow[]>([])
  const [metadata, setMetadata] = React.useState<DashboardMetadata>({})
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof CampaignRow | null
    direction: "asc" | "desc"
  }>({ key: "totalScans", direction: "desc" })

  React.useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        const response = await apiClient.getDashboardOverview({
          comparePrevious: true,
          topCampaignsLimit: 5,
          includeInactive: true,
        })

        const kpisBlock = (response.kpis ?? {}) as Record<string, unknown>
        const scansMetric = parseKpiMetric(kpisBlock.total_scans)
        const campaignsMetric = parseKpiMetric(kpisBlock.active_campaigns)
        const usersMetric = parseKpiMetric(kpisBlock.total_unique_users)
        const growthMetric = parseKpiMetric(kpisBlock.system_growth)

        const kpis: DashboardKpi[] = [
          {
            title: "Total Scans",
            value: numberFormatter.format(scansMetric.value),
            change: scansMetric.changeLabel,
            trend: scansMetric.trend,
            icon: Scan,
            description: scansMetric.description,
          },
          {
            title: "Active Campaigns",
            value: numberFormatter.format(campaignsMetric.value),
            change: campaignsMetric.changeLabel,
            trend: campaignsMetric.trend,
            icon: Activity,
            description: campaignsMetric.description,
          },
          {
            title: "Total Unique Users",
            value: numberFormatter.format(usersMetric.value),
            change: usersMetric.changeLabel,
            trend: usersMetric.trend,
            icon: Users,
            description: `${usersMetric.description} (deduplicated by backend)`,
          },
          {
            title: "System Growth",
            value: `${growthMetric.value.toFixed(1)}%`,
            change: growthMetric.changeLabel,
            trend: growthMetric.trend,
            icon: TrendingUp,
            description: growthMetric.description,
          },
        ]

        const rows = toCampaignRows(response)
        const scansRows = toScansChartRows(response)
        const trafficRows = toTrafficRows(response)
        const metadataBlock = toMetadata(response)

        if (!cancelled) {
          setCampaignRows(rows)
          setGlobalKpiData(kpis)
          setScansPerCampaignData(scansRows)
          setTrafficDistributionData(trafficRows)
          setMetadata(metadataBlock)
        }
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load dashboard overview data from backend.")
          setCampaignRows([])
          setGlobalKpiData([])
          setScansPerCampaignData([])
          setTrafficDistributionData([])
          setMetadata({})
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const pieChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: "Traffic %",
      },
    }

    for (const campaign of trafficDistributionData) {
      config[campaign.name] = {
        label: campaign.name,
        color: campaign.fill,
      }
    }

    return config
  }, [trafficDistributionData])

  // Filter and sort campaigns
  const filteredCampaigns = React.useMemo(() => {
    const filtered = campaignRows.filter(campaign =>
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
  }, [campaignRows, searchQuery, sortConfig])

  const handleSort = (key: keyof CampaignRow) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Global Overview</h1>
        <p className="text-muted-foreground">
          System-wide metrics and campaign performance across all QR campaigns
        </p>
        {(metadata.startDate || metadata.endDate) && (
          <p className="text-sm text-muted-foreground">
            Range: {metadata.startDate ?? "-"} to {metadata.endDate ?? "-"}
            {typeof metadata.comparePrevious === "boolean" && (
              <span> | Compare previous: {metadata.comparePrevious ? "On" : "Off"}</span>
            )}
            {typeof metadata.includeInactive === "boolean" && (
              <span> | Include inactive: {metadata.includeInactive ? "Yes" : "No"}</span>
            )}
            {metadata.topCampaignsLimit ? (
              <span> | Top campaigns limit: {metadata.topCampaignsLimit}</span>
            ) : null}
          </p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Loading live dashboard data...</p>}
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      </div>

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
                ) : kpi.trend === "down" ? (
                  <ArrowDownRight className="size-3 text-red-500" />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                <span
                  className={
                    kpi.trend === "up"
                      ? "text-emerald-500"
                      : kpi.trend === "down"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }
                >
                  {kpi.change}
                </span>
                <span className="text-muted-foreground">
                  {kpi.trend === "neutral" ? "vs previous period" : "vs last period"}
                </span>
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
            <CardTitle>Scans per Campaign</CardTitle>
            <CardDescription>Top performing campaigns by total scans</CardDescription>
          </CardHeader>
          <CardContent>
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
                    content={(props) => <ChartTooltipContent {...props} />}
                    formatter={(value) => [`${Number(value).toLocaleString()} scans`, "Total"]}
                  />
                  <Bar dataKey="scans" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Traffic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Distribution</CardTitle>
            <CardDescription>Percentage of traffic across campaigns</CardDescription>
          </CardHeader>
          <CardContent>
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
                    label={({ value }) => `${value}%`}
                    labelLine={false}
                  />
                  <ChartTooltip
                    content={(props) => <ChartTooltipContent {...props} />}
                    formatter={(value) => [`${value}%`, "Traffic Share"]}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Complete list of QR campaigns in your system</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                      Campaign Name
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    className="cursor-pointer text-right hover:bg-muted/50"
                    onClick={() => handleSort("totalScans")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total Scans
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right hover:bg-muted/50"
                    onClick={() => handleSort("uniqueUsers")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Unique Users
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      Created
                      <ArrowUpDown className="size-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="group">
                      <TableCell>
                        <Link
                          href={`/dashboard?tab=campaign-detail&campaignId=${encodeURIComponent(campaign.id)}&campaignName=${encodeURIComponent(campaign.name)}`}
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
                              : "border-muted-foreground/50 bg-muted text-muted-foreground"
                          }
                        >
                          {campaign.statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {campaign.totalScans.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.uniqueUsers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(campaign.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Link href={`/dashboard?tab=campaign-detail&campaignId=${encodeURIComponent(campaign.id)}&campaignName=${encodeURIComponent(campaign.name)}`}>
                            <Eye className="mr-1 size-3" />
                            See analytics
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Showing {filteredCampaigns.length} of {campaignRows.length} campaigns
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
