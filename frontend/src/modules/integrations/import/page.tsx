"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Calendar,
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  User,
  X,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/table-pagination"
import { getCalendarEvents, importCampaigns } from "@/apis/calendar-api"
import { getIntegrations } from "@/apis/integrations-api"
import { queryKeys, staleTimes, cacheInvalidations } from "@/lib/cache/query-client"
import type { CalendarEvent as APICalendarEvent } from "@/apis/generated/types"

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

const years = ["2024", "2025", "2026", "2027"]

type FilterType = "none" | "month" | "year" | "range"

function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

// Transform API event to display format
function transformEvent(event: APICalendarEvent) {
  return {
    id: event.id,
    name: event.title,
    startDate: event.startTime,
    endDate: event.endTime,
    imported: event.linkedCampaignId !== null && event.linkedCampaignId !== undefined,
  }
}

export default function ImportFromCalendarPage() {
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([])
  const [importSuccess, setImportSuccess] = React.useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  // Filter states
  const [filterType, setFilterType] = React.useState<FilterType>("none")
  const [selectedMonth, setSelectedMonth] = React.useState<string>("")
  const [selectedYear, setSelectedYear] = React.useState<string>("2026")
  const [startDateRange, setStartDateRange] = React.useState<string>("")
  const [endDateRange, setEndDateRange] = React.useState<string>("")

  // Fetch integrations for connected account info
  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations.status(),
    queryFn: () => getIntegrations(),
    staleTime: staleTimes.campaigns,
  })

  // Build calendar events request params based on filters
  const eventsParams = React.useMemo(() => {
    const year = parseInt(selectedYear) || new Date().getFullYear()

    if (filterType === "month" && selectedMonth) {
      return {
        rangeType: "month" as const,
        year,
        month: parseInt(selectedMonth),
      }
    }
    if (filterType === "year") {
      return {
        rangeType: "year" as const,
        year,
      }
    }
    // Default: fetch current year
    return {
      rangeType: "year" as const,
      year: new Date().getFullYear(),
    }
  }, [filterType, selectedMonth, selectedYear])

  // Fetch calendar events from API
  const eventsQuery = useQuery({
    queryKey: queryKeys.integrations.calendar.events(
      eventsParams.year,
      (eventsParams as { month?: number }).month
    ),
    queryFn: () => getCalendarEvents(eventsParams),
    staleTime: staleTimes.campaigns,
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: importCampaigns,
    onSuccess: () => {
      cacheInvalidations.importCampaignsFromCalendar()
      setImportSuccess(true)
      setSelectedEvents([])
      setTimeout(() => setImportSuccess(false), 3000)
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

  const isLoading = eventsQuery.isLoading || integrationsQuery.isLoading
  const isError = eventsQuery.isError || integrationsQuery.isError

  // Transform API events for display
  const events = React.useMemo(() => {
    const apiEvents = eventsQuery.data?.events || []
    return apiEvents.map(transformEvent)
  }, [eventsQuery.data])

  // Filter events based on selected filter and search
  const filteredEvents = React.useMemo(() => {
    let filtered = events

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter((event) =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply date range filter (client-side for range filter)
    if (filterType === "range" && startDateRange && endDateRange) {
      filtered = filtered.filter((event) => {
        const eventStart = new Date(event.startDate)
        const start = new Date(startDateRange)
        const end = new Date(endDateRange)
        return eventStart >= start && eventStart <= end
      })
    }

    return filtered
  }, [events, searchQuery, filterType, startDateRange, endDateRange])

  // Paginated events
  const paginatedEvents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredEvents.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredEvents, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage)

  const unimportedEvents = filteredEvents.filter((e) => !e.imported)
  const allSelected =
    unimportedEvents.length > 0 &&
    unimportedEvents.every((e) => selectedEvents.includes(e.id))
  const someSelected = selectedEvents.length > 0

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedEvents([])
    } else {
      setSelectedEvents(unimportedEvents.map((e) => e.id))
    }
  }

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleImport = async () => {
    if (selectedEvents.length === 0) return

    const paramsWithMonth = eventsParams as { rangeType: 'month' | 'year'; year: number; month?: number }
    const requestBody: { rangeType: 'month' | 'year'; year: number; month?: number; eventIds: string[] } = {
      rangeType: eventsParams.rangeType,
      year: eventsParams.year,
      eventIds: selectedEvents,
    }

    if (paramsWithMonth.month !== undefined) {
      requestBody.month = paramsWithMonth.month
    }

    importMutation.mutate(requestBody)
  }

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilterType("none")
    setSelectedMonth("")
    setSelectedYear("2026")
    setStartDateRange("")
    setEndDateRange("")
    setCurrentPage(1)
  }

  const hasActiveFilter = filterType !== "none"

  const getActiveFilterLabel = () => {
    if (filterType === "month" && selectedMonth && selectedYear) {
      const monthName = months.find((m) => m.value === selectedMonth)?.label
      return `${monthName} ${selectedYear}`
    }
    if (filterType === "year" && selectedYear) {
      return selectedYear
    }
    if (filterType === "range" && startDateRange && endDateRange) {
      return `${formatDate(startDateRange)} - ${formatDate(endDateRange)}`
    }
    return ""
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Import from Calendar</h1>
        <p className="text-muted-foreground">
          Import events from your Google Calendar to create campaigns
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
                Events will be imported from this Google Calendar account
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

      {/* Calendar Events Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendar Events</CardTitle>
              <CardDescription>
                Select events from your calendar to import as campaigns
              </CardDescription>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Active Filter Badge */}
              {hasActiveFilter && (
                <Badge variant="secondary" className="gap-1">
                  {getActiveFilterLabel()}
                  <button
                    onClick={clearFilters}
                    className="ml-1 rounded-full hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}

              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="size-4" />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Filter Events</h4>
                      <p className="text-sm text-muted-foreground">
                        Filter events by month, year, or date range
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label>Filter Type</Label>
                        <Select
                          value={filterType}
                          onValueChange={(value: FilterType) => setFilterType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Filter</SelectItem>
                            <SelectItem value="month">By Month</SelectItem>
                            <SelectItem value="year">By Year</SelectItem>
                            <SelectItem value="range">Date Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {filterType === "month" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label>Month</Label>
                            <Select
                              value={selectedMonth}
                              onValueChange={setSelectedMonth}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                              <SelectContent>
                                {months.map((month) => (
                                  <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Year</Label>
                            <Select
                              value={selectedYear}
                              onValueChange={setSelectedYear}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {years.map((year) => (
                                  <SelectItem key={year} value={year}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {filterType === "year" && (
                        <div className="space-y-2">
                          <Label>Year</Label>
                          <Select
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {filterType === "range" && (
                        <div className="grid gap-2">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={startDateRange}
                              onChange={(e) => setStartDateRange(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={endDateRange}
                              onChange={(e) => setEndDateRange(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {hasActiveFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="w-full"
                        >
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Select All Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={unimportedEvents.length === 0}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-4 size-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No events found</h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilter
                  ? "Try adjusting your filter criteria"
                  : "No events available in your calendar"}
              </p>
              {hasActiveFilter && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Clear Filter
                </Button>
              )}
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
                      disabled={unimportedEvents.length === 0}
                    />
                  </TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className={event.imported ? "opacity-60" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedEvents.includes(event.id) || event.imported}
                        onCheckedChange={() => handleSelectEvent(event.id)}
                        disabled={event.imported}
                        aria-label={`Select ${event.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        {event.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(event.startDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(event.endDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      {event.imported ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                        >
                          Imported
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {filteredEvents.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEvents.length}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              className="mt-4"
            />
          )}

          {/* Import Button */}
          <div className="mt-6 flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {selectedEvents.length > 0 ? (
                <span>{selectedEvents.length} event(s) selected</span>
              ) : (
                <span>Select events to import</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {importSuccess && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Imported successfully
                </span>
              )}
              <Button
                onClick={handleImport}
                disabled={!someSelected || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Import from Calendar
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
