"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Calendar,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  User,
  AlertTriangle,
  Search, ChevronRight,
  ChevronLeft,
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
import { getCampaigns } from "@/apis/campaigns-api"
import { getIntegrations } from "@/apis/integrations-api"
import { unlinkCampaign } from "@/apis/calendar-api"
import { queryKeys, staleTimes, cacheInvalidations } from "@/lib/cache/query-client"
import type { Campaign } from "@/apis/generated/types"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

function formatDateTime(dateString: string | undefined | null) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

// Transform campaign to synced event format
interface SyncedEvent {
  id: string
  name: string
  startDate: string
  endDate: string
  campaignName: string
  syncedAt: string | null
}

function transformCampaign(campaign: Campaign): SyncedEvent | null {
  // Only show campaigns that are synced to calendar
  const isSynced = campaign.calendarSyncStatus === 'synced' ||
                   campaign.calendarSyncStatus === 'out_of_sync' ||
                   Boolean(campaign.googleEventId)

  if (!isSynced) return null

  return {
    id: String(campaign.id),
    name: campaign.name,
    startDate: campaign.startDate || '',
    endDate: campaign.endDate || '',
    campaignName: campaign.name,
    syncedAt: null,
  }
}

export default function RemoveEventPage() {
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([])
  const [removeSuccess, setRemoveSuccess] = React.useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  // Fetch campaigns from API
  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: () => getCampaigns(),
    staleTime: staleTimes.campaigns,
  })

  // Fetch integrations for connected account info
  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.status(),
    queryFn: () => getIntegrations(),
    staleTime: staleTimes.campaigns,
  })

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: unlinkCampaign,
    onSuccess: (_, variables) => {
      cacheInvalidations.unlinkCampaignFromCalendar(variables.campaignId)
    },
  })

  // Get connected account info
  const connectedAccount = React.useMemo(() => {
    const integration = integrationsQuery.data?.integrations?.find(
      (i) => i.provider === "google_calendar" && i.connected
    )
    return {
      email: integration?.accountEmail || "Not connected",
      name: integration?.accountEmail?.split("@")[0] || "Unknown",
    }
  }, [integrationsQuery.data])

  const isLoading = campaignsQuery.isLoading || integrationsQuery.isLoading
  const isError = campaignsQuery.isError || integrationsQuery.isError

  // Transform campaigns to synced events (only synced ones)
  const syncedEvents = React.useMemo(() => {
    const campaigns = campaignsQuery.data?.campaigns || []
    return campaigns
      .map(transformCampaign)
      .filter((event): event is SyncedEvent => event !== null)
  }, [campaignsQuery.data])

  // Filtered events
  const filteredEvents = React.useMemo(() => {
    if (!searchQuery) return syncedEvents
    return syncedEvents.filter((event) =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [syncedEvents, searchQuery])

  // Paginated events
  const paginatedEvents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredEvents.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredEvents, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage)

  const allSelected = filteredEvents.length > 0 &&
    filteredEvents.every((e) => selectedEvents.includes(e.id))
  const someSelected = selectedEvents.length > 0

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedEvents([])
    } else {
      setSelectedEvents(filteredEvents.map((e) => e.id))
    }
  }

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value))
    setCurrentPage(1)
  }

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleRemove = async () => {
    if (selectedEvents.length === 0) return

    setRemoveSuccess(false)

    // Unlink all selected campaigns from calendar
    await Promise.all(
      selectedEvents.map((campaignId) =>
        unlinkMutation.mutateAsync({ campaignId })
      )
    )

    setRemoveSuccess(true)
    setSelectedEvents([])

    // Reset success message after 3 seconds
    setTimeout(() => setRemoveSuccess(false), 3000)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Remove Event</h1>
        <p className="text-muted-foreground">
          Remove events that were synced from campaigns to your Google Calendar
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
                Events will be removed from this Google Calendar account
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

      {/* Synced Events List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Synced Events</CardTitle>
              <CardDescription>
                Select the events you want to remove from Google Calendar
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredEvents.length === 0}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by event or campaign name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 size-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No Synced Events</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                There are no events synced to your calendar that can be removed.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all events"
                    />
                  </TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Synced At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => handleSelectEvent(event.id)}
                        aria-label={`Select ${event.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{event.name}</span>
                        <span className="text-xs text-muted-foreground">
                          From: {event.campaignName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(event.startDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(event.endDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(event.syncedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {filteredEvents.length > 0 && (
            <div className="flex items-center justify-between border-t px-2 py-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChange}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Button */}
          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {selectedEvents.length > 0 ? (
                <span>{selectedEvents.length} event(s) selected</span>
              ) : (
                <span>Select events to remove</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {removeSuccess && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Removed successfully
                </span>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!someSelected || unlinkMutation.isPending}
                    className="gap-2"
                  >
                    {unlinkMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        Remove from Calendar
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-destructive" />
                      Remove Events from Calendar
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove {selectedEvents.length} event(s) from your
                      Google Calendar? This action cannot be undone. The events will be permanently
                      deleted from your calendar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove Events
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}
