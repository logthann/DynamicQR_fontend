"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Calendar,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { getCampaigns } from "@/apis/campaigns-api"
import { getIntegrations } from "@/apis/integrations-api"
import { syncCampaign } from "@/apis/calendar-api"
import { queryKeys, staleTimes, cacheInvalidations } from "@/lib/cache/query-client"
import type { Campaign } from "@/apis/generated/types"

function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

interface CampaignSyncItem extends Campaign {
  synced: boolean
}

export default function SyncToCalendarPage() {
  const [selectedCampaigns, setSelectedCampaigns] = React.useState<string[]>([])
  const [syncSuccess, setSyncSuccess] = React.useState(false)

  // Search and filter
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  // Fetch campaigns from API
  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: () => getCampaigns(),
    staleTime: staleTimes.campaigns,
  })

  // Fetch integrations to get connected account info
  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.status(),
    queryFn: () => getIntegrations(),
    staleTime: staleTimes.campaigns,
  })

  // Sync campaign mutation
  const syncMutation = useMutation({
    mutationFn: syncCampaign,
    onSuccess: (_, variables) => {
      cacheInvalidations.syncCampaignToCalendar(variables.campaignId)
    },
  })

  // Transform campaigns data
  const campaigns: CampaignSyncItem[] = React.useMemo(() => {
    const rawCampaigns = campaignsQuery.data?.campaigns || []
    return rawCampaigns.map((c) => ({
      ...c,
      synced: c.calendarSyncStatus === 'synced' || c.calendarSyncStatus === 'out_of_sync' || Boolean(c.googleEventId),
    })) as CampaignSyncItem[]
  }, [campaignsQuery.data])

  // Get connected account info
  const connectedAccount = React.useMemo(() => {
    const integration = integrationsQuery.data?.integrations?.find(
      (i) => i.provider === 'google_calendar' && i.connected
    )
    return {
      email: integration?.accountEmail || 'Not connected',
      name: integration?.accountEmail?.split('@')[0] || 'Unknown',
    }
  }, [integrationsQuery.data])

  const isLoading = campaignsQuery.isLoading || integrationsQuery.isLoading
  const isError = campaignsQuery.isError || integrationsQuery.isError

  // Filtered campaigns
  const filteredCampaigns = React.useMemo(() => {
    let filtered = campaigns

    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    return filtered
  }, [campaigns, searchQuery, statusFilter])

  // Paginated campaigns
  const paginatedCampaigns = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredCampaigns.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredCampaigns, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredCampaigns.length / rowsPerPage)

  const unsyncedCampaigns = filteredCampaigns.filter((c) => !c.synced)
  const allSelected = unsyncedCampaigns.length > 0 &&
    unsyncedCampaigns.every((c) => selectedCampaigns.includes(c.id))
  const someSelected = selectedCampaigns.length > 0

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedCampaigns([])
    } else {
      setSelectedCampaigns(unsyncedCampaigns.map((c) => c.id))
    }
  }

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId]
    )
  }

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows)
    setCurrentPage(1)
  }

  const handleSync = async () => {
    if (selectedCampaigns.length === 0) return

    setSyncSuccess(false)

    // Sync all selected campaigns
    await Promise.all(
      selectedCampaigns.map((campaignId) =>
        syncMutation.mutateAsync({ campaignId })
      )
    )

    setSyncSuccess(true)
    setSelectedCampaigns([])

    // Reset success message after 3 seconds
    setTimeout(() => setSyncSuccess(false), 3000)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sync to Calendar</h1>
        <p className="text-muted-foreground">
          Synchronize your campaigns to Google Calendar for easy scheduling and reminders
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading data...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
          <p className="text-sm text-destructive">
            Failed to load data. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
      {/* Connected Account Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Connected Account</CardTitle>
              <CardDescription>
                Events will be created in this Google Calendar account
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
            >
              <CheckCircle2 className="mr-1 size-3" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <p className="font-medium">{connectedAccount.name}</p>
                <p className="text-sm text-muted-foreground">{connectedAccount.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href="/dashboard/integrations/setup">
                <RefreshCw className="size-4" />
                Switch Account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>
                Select the campaigns you want to sync to Google Calendar
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={unsyncedCampaigns.length === 0}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all campaigns"
                    disabled={unsyncedCampaigns.length === 0}
                  />
                </TableHead>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCampaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className={campaign.synced ? "opacity-60" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedCampaigns.includes(campaign.id) || campaign.synced}
                        onCheckedChange={() => handleSelectCampaign(campaign.id)}
                        disabled={campaign.synced}
                        aria-label={`Select ${campaign.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {campaign.name}
                        {campaign.synced && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 text-xs"
                          >
                            <Calendar className="mr-1 size-3" />
                            Synced
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(campaign.startDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(campaign.endDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={campaign.status === "active" ? "default" : "secondary"}
                        className={
                          campaign.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            : ""
                        }
                      >
                        {(campaign.status ?? 'unknown').charAt(0).toUpperCase() + (campaign.status ?? 'unknown').slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCampaigns.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            className="mt-4"
          />

          {/* Sync Button */}
          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {selectedCampaigns.length > 0 ? (
                <span>{selectedCampaigns.length} campaign(s) selected</span>
              ) : (
                <span>Select campaigns to sync</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {syncSuccess && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Synced successfully
                </span>
              )}
              <Button
                onClick={handleSync}
                disabled={!someSelected || syncMutation.isPending}
                className="gap-2"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Calendar className="size-4" />
                    Sync to Calendar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}
