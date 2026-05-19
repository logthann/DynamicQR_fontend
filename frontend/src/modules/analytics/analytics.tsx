"use client"

import * as React from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Users,
  TrendingUp,
  TrendingDown,
  Database,
  BarChart3,
  Loader2,
  QrCode,
  History,
  Trophy,
  Zap,
  ExternalLink,
  Check,
  X,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  CartesianGrid,
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
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  getCampaignKPISummary,
  getCampaignHourlyScans,
  getCampaignGA4Realtime,
  getCampaignGA4Insights,
  getCampaignScanLogs,
  getCampaignQRComparison,
  type HourlyScanData,
  type GA4RealtimeData,
  type GA4InsightEntry,
  type ComparisonVersion,
  type ScanLogEntry,
} from "@/apis/analytics-api"
import { getCampaigns, type Campaign } from "@/apis/campaigns-api"
import type { QRCode } from "@/apis/generated/types"

// Chart configs with distinct colors for Internal (blue) vs GA4 (orange)
const internalChartConfig = {
  scans: { label: "Total Scans", color: "hsl(221, 83%, 53%)" }, // Blue
  mobile: { label: "Mobile", color: "hsl(221, 83%, 53%)" },
  desktop: { label: "Desktop", color: "hsl(221, 83%, 68%)" },
  tablet: { label: "Tablet", color: "hsl(221, 83%, 83%)" },
} satisfies ChartConfig

const ga4ChartConfig = {
  active_users: { label: "Active Users", color: "hsl(25, 95%, 53%)" }, // Orange
} satisfies ChartConfig

type QRComparisonRow = {
  id: string
  name: string
  campaign: string
  destinationUrl: string
  totalScans: number
  uniqueScans: number
  growth: number | null
  sparkline: number[]
  versions: ComparisonVersion[]
  status?: QRCode["status"]
  createdAt?: string
}

type RawScanLogEntry = ScanLogEntry & {
  scanned_at?: string
  device_type?: string
  city?: string
  country?: string
}

function ScanProgressBar({ value, max }: { value: number; max: number }) {
   const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

   return (
     <div className="flex items-center gap-2">
       <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
         <div
           className="h-full rounded-full bg-blue-500 transition-all"
           style={{ width: `${percentage}%` }}
         />
       </div>
       <span className="text-sm tabular-nums text-muted-foreground">
         {value.toLocaleString()}
       </span>
     </div>
   )
 }

 function SparklineChart({ data }: { data: number[] }) {
   if (!data || data.length === 0) {
     return <span className="text-xs text-muted-foreground">No data</span>
   }

   // Convert array of numbers to chart data format
   const chartData = data.map((value, index) => ({
     index,
     value,
   }))

   // Find min and max for scaling
   const minValue = Math.min(...data)
   const maxValue = Math.max(...data)
   const range = maxValue - minValue || 1

   return (
     <div className="h-12 w-32">
       <ResponsiveContainer width="100%" height="100%">
         <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
           <defs>
             <linearGradient id="colorSparkline" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
               <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
             </linearGradient>
           </defs>
           <Area
             type="monotone"
             dataKey="value"
             stroke="hsl(221, 83%, 53%)"
             strokeWidth={1.5}
             fillOpacity={1}
             fill="url(#colorSparkline)"
           />
         </AreaChart>
       </ResponsiveContainer>
     </div>
   )
 }

export default function CampaignAnalyticsPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = React.useState(true)
  const [dateRangeOpen, setDateRangeOpen] = React.useState(false)
  const [startDate, setStartDate] = React.useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().split('T')[0])
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")
  const [internalCurrentPage, setInternalCurrentPage] = React.useState(1)
  const [ga4CurrentPage, setGa4CurrentPage] = React.useState(1)
  const [activeUsersGA4, setActiveUsersGA4] = React.useState(0)
  const [lastUpdatedInternal, setLastUpdatedInternal] = React.useState<Date>(new Date())
  const [lastUpdatedGA4, setLastUpdatedGA4] = React.useState<Date>(new Date())
  const [displayedTotalScans, setDisplayedTotalScans] = React.useState(0)
  const [displayedConversionRate, setDisplayedConversionRate] = React.useState(0)
  const [avgSessionDuration, setAvgSessionDuration] = React.useState(0)
  const [realtimeMode] = React.useState(true)
  const [isRealtimeInitializing] = React.useState(false)
  const itemsPerPage = 5

  // Real API data states
  const [internalScanData, setInternalScanData] = React.useState<HourlyScanData[]>([])
  const [ga4RealtimeData, setGa4RealtimeData] = React.useState<GA4RealtimeData[]>([])
  const [ga4InsightsData, setGa4InsightsData] = React.useState<GA4InsightEntry[]>([])
  const [scanLogs, setScanLogs] = React.useState<ScanLogEntry[]>([])
  const [totalScanLogs, setTotalScanLogs] = React.useState(0)
  const [internalTotalPages, setInternalTotalPages] = React.useState(1)
  const [qrComparisonRows, setQrComparisonRows] = React.useState<QRComparisonRow[]>([])
  const [isLoadingComparison, setIsLoadingComparison] = React.useState(false)
  const [selectedQrId, setSelectedQrId] = React.useState<string | null>(null)

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaign)
  const selectedQrComparison = selectedQrId
    ? qrComparisonRows.find((qr) => qr.id === selectedQrId) ?? null
    : null
  const maxQrScans = React.useMemo(
    () => Math.max(0, ...qrComparisonRows.map((qr) => qr.totalScans)),
    [qrComparisonRows]
  )

  // Fetch campaigns list
  const fetchCampaigns = React.useCallback(async () => {
    try {
      setIsLoadingCampaigns(true)
      const response = await getCampaigns()
      setCampaigns(response.campaigns)
      // Select first campaign if available and none selected
      if (response.campaigns.length > 0 && !selectedCampaign) {
        setSelectedCampaign(response.campaigns[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      toast({
        title: "Error",
        description: "Failed to load campaigns. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCampaigns(false)
    }
  }, [selectedCampaign, toast])

  // Load campaigns on mount
  React.useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Fetch KPI data
  const fetchKPIData = React.useCallback(async () => {
    try {
      const campaignId = parseInt(selectedCampaign)
      const data = await getCampaignKPISummary(campaignId)
      setDisplayedTotalScans(data.total_scans)
      setActiveUsersGA4(data.active_users_ga4)
      setDisplayedConversionRate(data.conversion_rate)
      setAvgSessionDuration(data.avg_session_duration)
    } catch (error) {
      console.error('Failed to fetch KPI data:', error)
      toast({
        title: "Error",
        description: "Failed to load KPI data. Please try again.",
        variant: "destructive",
      })
    }
  }, [selectedCampaign, toast])

   // Fetch hourly scan data
   const fetchHourlyScans = React.useCallback(async () => {
     try {
       const campaignId = parseInt(selectedCampaign)
       // Fetch last 8 hours of data for the chart
       const now = new Date()
       const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000)
       const startDateTime = eightHoursAgo.toISOString()
       const endDateTime = now.toISOString()
       const response = await getCampaignHourlyScans(campaignId, startDateTime, endDateTime)
       setInternalScanData(response.data)
       setLastUpdatedInternal(new Date())
     } catch (error) {
       console.error('Failed to fetch hourly scans:', error)
     }
   }, [selectedCampaign])

  // Fetch GA4 real-time data
  const fetchGA4Realtime = React.useCallback(async () => {
    try {
      const campaignId = parseInt(selectedCampaign)
      const response = await getCampaignGA4Realtime(campaignId)
      setGa4RealtimeData(response.data)
      setLastUpdatedGA4(new Date())
    } catch (error) {
      console.error('Failed to fetch GA4 real-time data:', error)
    }
  }, [selectedCampaign])

   // Fetch scan logs
   const fetchScanLogs = React.useCallback(async () => {
     try {
       const campaignId = parseInt(selectedCampaign)
       // Calculate last 24 hours
       const now = new Date()
       const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
       const startDateTime = oneDayAgo.toISOString()
       const endDateTime = now.toISOString()

       const response = await getCampaignScanLogs(campaignId, internalCurrentPage, itemsPerPage, startDateTime, endDateTime)
       console.log('Scan logs response:', response)
       // API returns { campaign_id, page, limit, total, logs: [...] }
       const logsArray = response.logs ?? response.data ?? []
       // Normalize field names from API (scanned_at → timestamp, device_type → device)
       const normalizedLogs = (logsArray as RawScanLogEntry[]).map((log) => ({
         id: log.id,
         timestamp: log.scanned_at || log.timestamp,
         ip_address: log.ip_address,
         device: log.device_type || log.device || 'Unknown',
         location: log.location || log.city || log.country || 'Unknown',
       }))
       setScanLogs(normalizedLogs)
       setTotalScanLogs(response.total)
       setInternalTotalPages(Math.ceil(response.total / itemsPerPage))
     } catch (error) {
       console.error('Failed to fetch scan logs:', error)
     }
   }, [selectedCampaign, internalCurrentPage])

  const fetchGA4Insights = React.useCallback(async () => {
    try {
      const campaignId = parseInt(selectedCampaign)
      const response = await getCampaignGA4Insights(campaignId)
      setGa4InsightsData(response.insights ?? [])
    } catch (error) {
      console.error("Failed to fetch GA4 insights:", error)
      setGa4InsightsData([])
    }
  }, [selectedCampaign])

  const fetchQRComparisonData = React.useCallback(async () => {
    if (!selectedCampaign) return

    try {
      setIsLoadingComparison(true)
      const campaignId = parseInt(selectedCampaign)
      const response = await getCampaignQRComparison(campaignId, startDate, endDate)
      const rows = response.qr_codes.map((qr) => ({
        id: qr.id,
        name: qr.name,
        campaign: qr.campaign || currentCampaign?.name || `Campaign ${selectedCampaign}`,
        destinationUrl: qr.destination_url,
        totalScans: qr.total_scans,
        uniqueScans: qr.unique_scans,
        growth: qr.growth,
        sparkline: qr.sparkline ?? [],
        versions: qr.versions ?? [],
        status: qr.versions?.[0]?.status === "archived" ? "archived" : "active",
        createdAt: qr.versions?.[0]?.active_period?.start,
      } satisfies QRComparisonRow))

      const sortedRows = rows.sort((a, b) => b.totalScans - a.totalScans)
      setQrComparisonRows(sortedRows)
      setSelectedQrId((current) =>
        current && sortedRows.some((row) => row.id === current) ? current : sortedRows[0]?.id ?? null
      )
    } catch (error) {
      console.error("Failed to fetch QR comparison data:", error)
      setQrComparisonRows([])
    } finally {
      setIsLoadingComparison(false)
    }
  }, [currentCampaign?.name, endDate, selectedCampaign, startDate])

  // Initial data load - only when campaign is selected
  React.useEffect(() => {
    if (!selectedCampaign) return
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchKPIData(),
        fetchHourlyScans(),
        fetchGA4Realtime(),
        fetchGA4Insights(),
        fetchScanLogs(),
        fetchQRComparisonData(),
      ])
      setIsLoading(false)
    }
    loadData()
  }, [fetchKPIData, fetchHourlyScans, fetchGA4Realtime, fetchGA4Insights, fetchScanLogs, fetchQRComparisonData, selectedCampaign])

  // Real-time updates every 10 seconds - only when campaign is selected
  React.useEffect(() => {
    if (!realtimeMode || !selectedCampaign) return

    const interval = setInterval(() => {
      fetchKPIData()
      fetchGA4Realtime()
    }, 10000)

    return () => clearInterval(interval)
  }, [realtimeMode, selectedCampaign, fetchKPIData, fetchGA4Realtime])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

    // Format hourly scan data for chart display
    const formattedInternalScanData = React.useMemo(() => {
      if (internalScanData.length === 0) {
        // Generate 8 empty hours for the last 8 hours
        const now = new Date()
        const emptyHours: HourlyScanData[] = []
        for (let i = 7; i >= 0; i--) {
          const hourDate = new Date(now)
          hourDate.setHours(hourDate.getHours() - i)
          hourDate.setMinutes(0)
          hourDate.setSeconds(0)
          hourDate.setMilliseconds(0)
          emptyHours.push({
            hour: hourDate.toISOString(),
            mobile: 0,
            desktop: 0,
            tablet: 0,
            scans: 0,
          })
        }
        return emptyHours.map(item => ({
          ...item,
          hourFormatted: new Date(item.hour).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        }))
      }

      // Create a map of existing data by hour
      const dataMap = new Map<string, HourlyScanData>()
      internalScanData.forEach(item => {
        const hourDate = new Date(item.hour)
        const hourKey = hourDate.toISOString().slice(0, 13) // YYYY-MM-DDTHH
        dataMap.set(hourKey, item)
      })

      // Generate 8-hour dataset starting from 8 hours ago to now
      const now = new Date()
      const allHours: HourlyScanData[] = []
      for (let i = 7; i >= 0; i--) {
        const hourDate = new Date(now)
        hourDate.setHours(hourDate.getHours() - i)
        hourDate.setMinutes(0)
        hourDate.setSeconds(0)
        hourDate.setMilliseconds(0)
        const hourKey = hourDate.toISOString().slice(0, 13)

        const existingData = dataMap.get(hourKey)
        allHours.push(
          existingData || {
            hour: hourDate.toISOString(),
            mobile: 0,
            desktop: 0,
            tablet: 0,
            scans: 0,
          }
        )
      }

      return allHours.map(item => ({
        ...item,
        hourFormatted: new Date(item.hour).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }))
    }, [internalScanData])

  // Sort and paginate internal logs from API
  const sortedInternalLogs = React.useMemo(() => {
    if (!sortColumn) return scanLogs
    return [...scanLogs].sort((a, b) => {
      const aVal = a[sortColumn as keyof typeof a]
      const bVal = b[sortColumn as keyof typeof b]
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return 0
    })
  }, [scanLogs, sortColumn, sortDirection])

   const internalStartIndex = (internalCurrentPage - 1) * itemsPerPage
   const paginatedInternalLogs = sortedInternalLogs.slice(internalStartIndex, internalStartIndex + itemsPerPage)

   const ga4TotalPages = Math.max(1, Math.ceil(ga4InsightsData.length / itemsPerPage))
  const ga4StartIndex = (ga4CurrentPage - 1) * itemsPerPage
  const paginatedGa4Insights = React.useMemo(
    () => ga4InsightsData.slice(ga4StartIndex, ga4StartIndex + itemsPerPage),
    [ga4InsightsData, ga4StartIndex, itemsPerPage]
  )

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatUrlLabel = (url: string) => {
    if (!url) return "No destination"
    try {
      const parsed = new URL(url)
      return `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`
    } catch {
      return url.replace(/^https?:\/\//, "")
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 5) return "Just now"
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Analytics Dashboard:</span>
          <Select
            value={selectedCampaign}
            onValueChange={setSelectedCampaign}
            disabled={isLoadingCampaigns || campaigns.length === 0}
          >
            <SelectTrigger className="h-auto w-auto border-none bg-transparent p-0 text-2xl font-bold tracking-tight shadow-none hover:bg-transparent focus:ring-0 focus-visible:ring-0 [&>svg]:size-5 [&>svg]:ml-1 [&>svg]:opacity-50 disabled:opacity-50">
              <SelectValue placeholder={isLoadingCampaigns ? "Loading..." : "Select campaign"} />
            </SelectTrigger>
            <SelectContent>
              {campaigns.length === 0 && !isLoadingCampaigns && (
                <div className="px-4 py-2 text-sm text-muted-foreground">No campaigns found</div>
              )}
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentCampaign && (
            <Badge
              variant="outline"
              className={
                currentCampaign.status === "active"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }
            >
              {currentCampaign.status ? currentCampaign.status.charAt(0).toUpperCase() + currentCampaign.status.slice(1) : "Unknown"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Compare internal scan logs with Google Analytics 4 data
        </p>
      </div>

      {/* Interactive Controls Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range Picker */}
        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <Calendar className="mr-2 size-4" />
              {startDate && endDate ? (
                <span>
                  {new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
                  {new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={() => setDateRangeOpen(false)}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-4">
          {/* Internal Scan Logs Live */}
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
            </span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Scan Logs: {formatTimeAgo(lastUpdatedInternal)}
            </span>
          </div>

          {/* GA4 Live */}
          <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
            </span>
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              GA4: {formatTimeAgo(lastUpdatedGA4)}
            </span>
          </div>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Internal Scans (Blue) */}
        {isLoading ? (
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Internal Scans
                </CardTitle>
              </div>
              <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                scan_logs
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-blue-700 transition-all duration-300 dark:text-blue-300">
                {displayedTotalScans.toLocaleString()}
              </div>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                Total physical QR scans recorded
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active Users GA4 (Orange) */}
        {isLoading ? (
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ) : (
          <Card className={`border-orange-500/20 bg-orange-500/5 ${realtimeMode ? "ring-1 ring-orange-500/30" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Active Users (GA4)
                </CardTitle>
              </div>
              {realtimeMode && !isRealtimeInitializing && (
                <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <span className="relative mr-1.5 flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-orange-500" />
                  </span>
                  LIVE
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold text-orange-700 dark:text-orange-300 ${realtimeMode ? "tabular-nums" : ""}`}>
                  {activeUsersGA4}
                </span>
                {realtimeMode && !isRealtimeInitializing && (
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                Real-time users on destination page
              </p>
            </CardContent>
          </Card>
        )}

        {/* Conversion Rate */}
        {isLoading ? (
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${realtimeMode ? "tabular-nums" : ""}`}>
                {displayedConversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Scans that reached website
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Charts Section - Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Chart: Internal Scan Logs (Blue) */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-blue-700 dark:text-blue-300">Internal Scan Logs</CardTitle>
                </div>
                <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  By Hour
                </Badge>
              </div>
              <CardDescription>
                Raw scan counts by hour with Device Type breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={internalChartConfig} className="h-[300px] w-full">
                <BarChart data={formattedInternalScanData} margin={{ left: 0, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis
                     dataKey="hourFormatted"
                     tickLine={false}
                     axisLine={false}
                     tickMargin={8}
                     interval={0}
                     fontSize={12}
                   />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={({ active, payload }) => active && payload ? <ChartTooltipContent hideLabel active={true} payload={payload} coordinate={undefined} label="" accessibilityLayer={false} activeIndex={undefined} /> : null} />
                  <Bar dataKey="mobile" stackId="a" fill="hsl(221, 83%, 53%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="desktop" stackId="a" fill="hsl(221, 83%, 68%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tablet" stackId="a" fill="hsl(221, 83%, 83%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: "hsl(221, 83%, 53%)" }} />
                  <span className="text-muted-foreground">Mobile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: "hsl(221, 83%, 68%)" }} />
                  <span className="text-muted-foreground">Desktop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: "hsl(221, 83%, 83%)" }} />
                  <span className="text-muted-foreground">Tablet</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Right Chart: GA4 Live (Orange) */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className={`border-orange-500/20 ${realtimeMode ? "ring-1 ring-orange-500/30" : ""}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-orange-600 dark:text-orange-400" />
                  <CardTitle className="text-orange-700 dark:text-orange-300">GA4 Active Users</CardTitle>
                </div>
                {realtimeMode && !isRealtimeInitializing && (
                  <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <span className="relative mr-1.5 flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-orange-500" />
                    </span>
                    LIVE
                  </Badge>
                )}
              </div>
              <CardDescription>
                Real-time users over last 30 minutes with Session Duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {realtimeMode && isRealtimeInitializing ? (
                <div className="flex h-[300px] flex-col items-center justify-center">
                  <div className="relative mb-4">
                    <div className="size-12 animate-pulse rounded-full bg-orange-500/20" />
                    <Loader2 className="absolute inset-0 m-auto size-6 animate-spin text-orange-500" />
                  </div>
                  <p className="text-lg font-medium text-orange-600 dark:text-orange-400">Connecting to GA4...</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Establishing real-time data stream
                  </p>
                </div>
              ) : (
                <>
                  <ChartContainer config={ga4ChartConfig} className="h-[300px] w-full">
                    <LineChart data={ga4RealtimeData} margin={{ left: 0, right: 12, top: 12, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis
                         dataKey="time_label"
                         tickLine={false}
                         axisLine={false}
                         tickMargin={8}
                         interval={0}
                         fontSize={12}
                       />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <ChartTooltip content={({ active, payload }) => active && payload ? <ChartTooltipContent hideLabel active={true} payload={payload} coordinate={undefined} label="" accessibilityLayer={false} activeIndex={undefined} /> : null} />
                      <Line
                        type="monotone"
                        dataKey="active_users"
                        stroke="hsl(25, 95%, 53%)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: "hsl(25, 95%, 53%)" }}
                      />
                    </LineChart>
                  </ChartContainer>
                  <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: "hsl(25, 95%, 53%)" }} />
                      <span className="text-muted-foreground">Active Users</span>
                    </div>
                    <div className="text-muted-foreground">
                      Avg. Session: <span className="font-medium text-foreground">{Math.round(avgSessionDuration)}s</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Comparison Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Analytics</CardTitle>
          <CardDescription>
            Compare QR performance from available backend analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="qrcodes" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="qrcodes" className="flex items-center gap-2">
                <QrCode className="size-4" />
                QR Codes
              </TabsTrigger>
              <TabsTrigger value="versions" className="flex items-center gap-2">
                <History className="size-4" />
                Versions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qrcodes" className="space-y-4">
              {isLoadingComparison ? (
                <div className="space-y-3 rounded-md border p-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-4/5" />
                </div>
              ) : qrComparisonRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
                  <QrCode className="mb-3 size-10 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">No QR analytics available</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    This campaign has no QR codes or analytics for the selected date range.
                  </p>
                </div>
              ) : (
                <>
                   <div className="rounded-md border">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead className="w-[220px]">QR Name</TableHead>
                           <TableHead>Campaign</TableHead>
                           <TableHead className="text-right">Total Scans</TableHead>
                           <TableHead className="text-right">Unique Scans</TableHead>
                           <TableHead>Trend</TableHead>
                           <TableHead className="text-right">Growth</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {qrComparisonRows.map((qr, index) => {
                           const fastestGrowth = qrComparisonRows
                             .filter((item) => item.growth !== null)
                             .sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0]?.id
                           const isTopPerformer = index === 0 && qr.totalScans > 0
                           const isFastestGrowth = qr.id === fastestGrowth && (qr.growth ?? 0) > 0

                           return (
                             <TableRow
                               key={qr.id}
                               className="cursor-pointer transition-colors hover:bg-muted/50"
                               onClick={() => setSelectedQrId(qr.id)}
                             >
                               <TableCell>
                                 <div className="flex flex-wrap items-center gap-2">
                                   <span className="font-medium">{qr.name}</span>
                                   {isTopPerformer && (
                                     <Badge
                                       variant="outline"
                                       className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                     >
                                       <Trophy className="mr-1 size-3" />
                                       Top
                                     </Badge>
                                   )}
                                   {isFastestGrowth && (
                                     <Badge
                                       variant="outline"
                                       className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                     >
                                       <Zap className="mr-1 size-3" />
                                       Fastest
                                     </Badge>
                                   )}
                                 </div>
                               </TableCell>
                               <TableCell className="text-muted-foreground">{qr.campaign}</TableCell>
                               <TableCell className="text-right tabular-nums font-medium">
                                 {qr.totalScans.toLocaleString()}
                               </TableCell>
                               <TableCell className="text-right tabular-nums text-muted-foreground">
                                 {qr.uniqueScans.toLocaleString()}
                               </TableCell>
                               <TableCell>
                                 <SparklineChart data={qr.sparkline} />
                               </TableCell>
                               <TableCell className="text-right">
                                 {qr.growth === null ? (
                                   <span className="text-muted-foreground">N/A</span>
                                 ) : (
                                   <div
                                     className={`flex items-center justify-end gap-1 font-medium ${
                                       qr.growth >= 0
                                         ? "text-emerald-600 dark:text-emerald-400"
                                         : "text-red-600 dark:text-red-400"
                                     }`}
                                   >
                                     {qr.growth >= 0 ? (
                                       <TrendingUp className="size-4" />
                                     ) : (
                                       <TrendingDown className="size-4" />
                                     )}
                                     {qr.growth >= 0 ? "+" : ""}
                                     {qr.growth.toFixed(1)}%
                                   </div>
                                 )}
                               </TableCell>
                             </TableRow>
                           )
                         })}
                       </TableBody>
                     </Table>
                   </div>
                  <p className="text-xs text-muted-foreground">
                    Growth compares the selected date range with the previous equal-length period.
                  </p>
                </>
              )}
            </TabsContent>

            <TabsContent value="versions" className="space-y-4">
               {!selectedQrComparison ? (
                 <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
                   <QrCode className="mb-3 size-10 text-muted-foreground/50" />
                   <p className="font-medium text-muted-foreground">Select a QR code to compare versions</p>
                   <p className="mt-1 text-sm text-muted-foreground/70">
                     Choose a QR code from the QR Codes tab first.
                   </p>
                 </div>
               ) : (
                 <>
                   <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                     <div className="flex items-center gap-3">
                       <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                         <QrCode className="size-5 text-blue-600 dark:text-blue-400" />
                       </div>
                       <div>
                         <p className="font-medium">{selectedQrComparison.name}</p>
                         <p className="text-sm text-muted-foreground">Version performance from campaign comparison API.</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <Select value={selectedQrId || ""} onValueChange={setSelectedQrId}>
                         <SelectTrigger className="w-auto">
                           <SelectValue>Change QR</SelectValue>
                         </SelectTrigger>
                         <SelectContent>
                           {qrComparisonRows.map((qr) => (
                             <SelectItem key={qr.id} value={qr.id}>
                               {qr.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <Button variant="outline" size="sm" onClick={() => setSelectedQrId(null)}>
                         <X className="size-4" />
                       </Button>
                     </div>
                   </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[90px]">Version</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Active Period</TableHead>
                          <TableHead>Destination URL</TableHead>
                          <TableHead>Scans</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQrComparison.versions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No version data available.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedQrComparison.versions.map((version) => (
                            <TableRow key={version.version}>
                              <TableCell>
                                <Badge variant={version.status === "current" ? "default" : "secondary"}>
                                  {version.version}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{version.title}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDateTime(version.active_period.start)} - {version.active_period.end ? formatDateTime(version.active_period.end) : "Present"}
                              </TableCell>
                              <TableCell>
                                {version.destination_url ? (
                                  <a
                                    href={version.destination_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    {formatUrlLabel(version.destination_url)}
                                    <ExternalLink className="size-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">No destination</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <ScanProgressBar value={version.total_scans} max={maxQrScans} />
                              </TableCell>
                              <TableCell className="text-right">
                                {version.status === "current" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  >
                                    <Check className="mr-1 size-3" />
                                    Current
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Archived</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Data Table Section with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            View detailed data from Internal scan logs and Google Analytics 4
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="internal" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="internal" className="flex items-center gap-2 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                <Database className="size-4" />
                Internal Scan Logs
              </TabsTrigger>
              <TabsTrigger value="ga4" className="flex items-center gap-2 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">
                <BarChart3 className="size-4" />
                GA4 Insights
              </TabsTrigger>
            </TabsList>

            {/* Internal Scan Logs Tab */}
            <TabsContent value="internal" className="space-y-4">
              <div className="rounded-md border border-blue-500/20">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-500/5">
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("timestamp")}
                          className="-ml-3 h-8 hover:bg-transparent"
                        >
                          Timestamp
                          <ArrowUpDown className="ml-2 size-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("ip_address")}
                          className="-ml-3 h-8 hover:bg-transparent"
                        >
                          IP Address
                          <ArrowUpDown className="ml-2 size-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("device")}
                          className="-ml-3 h-8 hover:bg-transparent"
                        >
                          Device
                          <ArrowUpDown className="ml-2 size-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("location")}
                          className="-ml-3 h-8 hover:bg-transparent"
                        >
                          Location
                          <ArrowUpDown className="ml-2 size-3" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInternalLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/5 font-normal text-blue-600 dark:text-blue-400">
                            {log.device}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {internalTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {internalStartIndex + 1} to {Math.min(internalStartIndex + itemsPerPage, totalScanLogs)} of {totalScanLogs} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInternalCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={internalCurrentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: internalTotalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={internalCurrentPage === page ? "default" : "outline"}
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => setInternalCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInternalCurrentPage((prev) => Math.min(prev + 1, internalTotalPages))}
                      disabled={internalCurrentPage === internalTotalPages}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* GA4 Insights Tab */}
            <TabsContent value="ga4" className="space-y-4">
              <div className="rounded-md border border-orange-500/20">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-500/5">
                      <TableHead>Active Page</TableHead>
                      <TableHead>Traffic Source</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Engagement Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGa4Insights.map((insight, index) => (
                      <TableRow key={`${insight.page_path}-${insight.session_source}-${index}`}>
                        <TableCell className="font-medium">{insight.page_path}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/5 font-normal text-orange-600 dark:text-orange-400">
                            {insight.session_source}
                          </Badge>
                        </TableCell>
                        <TableCell>{insight.device_category}</TableCell>
                        <TableCell className="tabular-nums">{Math.round(insight.engagement_time)}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {ga4TotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {ga4InsightsData.length === 0 ? 0 : ga4StartIndex + 1} to {Math.min(ga4StartIndex + itemsPerPage, ga4InsightsData.length)} of {ga4InsightsData.length} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGa4CurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={ga4CurrentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: ga4TotalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={ga4CurrentPage === page ? "default" : "outline"}
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => setGa4CurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGa4CurrentPage((prev) => Math.min(prev + 1, ga4TotalPages))}
                      disabled={ga4CurrentPage === ga4TotalPages}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
