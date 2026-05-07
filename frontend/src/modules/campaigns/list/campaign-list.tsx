"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react"

import { deleteCampaign, getCampaigns } from "@/apis/campaigns-api"
import { getAuthContext } from "@/apis/auth-fetch"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { TablePagination } from "@/components/ui/table-pagination"
import { useLanguage } from "@/contexts/language-context"

export default function CampaignList() {
  const { t } = useLanguage()
  const isAdmin = getAuthContext().role === "admin"

  // API response type with creator info from backend
  type CampaignWithCreator = {
    id: string
    name: string
    description?: string
    status: 'active' | 'paused' | 'draft' | 'archived'
    startDate?: string
    endDate?: string
    googleEventId?: string
    calendarSyncStatus?: 'not_linked' | 'synced' | 'out_of_sync' | 'removed'
    calendarLastSyncedAt?: string
    gaMeasurementId?: string
    createdAt: string
    updatedAt: string
    creator?: {
      username?: string
      email?: string
    }
  }

  // States cho Dữ liệu thực tế
  const [campaigns, setCampaigns] = React.useState<CampaignWithCreator[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [totalItems, setTotalItems] = React.useState(0)

  // States cho Filters
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof CampaignWithCreator
    direction: "asc" | "desc"
  }>({ key: "createdAt", direction: "desc" })

  // States cho Phân trang
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  // State cho Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedCampaign, setSelectedCampaign] = React.useState<CampaignWithCreator | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // --- LOGIC FETCH DỮ LIỆU THỰC TẾ ---
  const fetchCampaigns = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // Call API - getCampaigns returns normalized data with camelCase fields and creator
      const response = await getCampaigns()
      // Cast to our extended type that includes creator
      let transformed = response.campaigns as CampaignWithCreator[]

      // Filter campaigns client-side based on search/filter criteria
      let filtered = transformed

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter((c) => {
          const creatorUsername = c.creator?.username?.toLowerCase() ?? ""
          const creatorEmail = c.creator?.email?.toLowerCase() ?? ""
          return (
            c.name.toLowerCase().includes(query) ||
            (c.description ?? "").toLowerCase().includes(query) ||
            creatorUsername.includes(query) ||
            creatorEmail.includes(query)
          )
        })
      }

      if (statusFilter !== "all") {
        filtered = filtered.filter((c) => c.status === statusFilter)
      }

      if (startDate) {
        filtered = filtered.filter((c) => c.startDate && c.startDate >= startDate)
      }

      if (endDate) {
        filtered = filtered.filter((c) => c.endDate && c.endDate <= endDate)
      }

      // Sort campaigns
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        if (aVal === undefined || bVal === undefined) return 0
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })

      // Paginate
      const start = (currentPage - 1) * rowsPerPage
      const paginated = filtered.slice(start, start + rowsPerPage)

      setCampaigns(paginated)
      setTotalItems(filtered.length)
    } catch (error) {
      console.error("Failed to fetch campaigns:", error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, rowsPerPage, searchQuery, statusFilter, startDate, endDate, sortConfig])

  // Fetch lại khi bất kỳ filter nào thay đổi
  React.useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const totalPages = Math.ceil(totalItems / rowsPerPage)

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows)
    setCurrentPage(1)
  }

  const handleSort = (key: keyof CampaignWithCreator) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleDelete = async () => {
    if (!selectedCampaign) return
    setIsDeleting(true)
    try {
      await deleteCampaign({ campaignId: selectedCampaign.id })
      fetchCampaigns() // Reload list
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete campaign:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "--/--/--"
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6">
        {/* Header - Giữ UI v0 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("campaignsPage.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("campaignsPage.subtitle")}</p>
          </div>
          <Button asChild className="bg-[#04AA6DFF] hover:bg-[#038e5b]">
            <Link href="/dashboard/campaigns/create">
              <Plus className="mr-2 size-4" />
              {t("campaignsPage.createCampaign")}
            </Link>
          </Button>
        </div>

        {/* Toolbox - Giữ UI v0 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("campaignsPage.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset về trang 1 khi search
                  }}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("campaignsPage.allStatus")}</SelectItem>
                    <SelectItem value="active">{t("campaignsPage.active")}</SelectItem>
                    <SelectItem value="paused">{t("campaignsPage.paused")}</SelectItem>
                  </SelectContent>
                </Select>

                <DateRangePicker
                  onChange={(range) => {
                    setStartDate(range?.from ? format(range.from, 'yyyy-MM-dd') : "")
                    setEndDate(range?.to ? format(range.to, 'yyyy-MM-dd') : "")
                    setCurrentPage(1)
                  }}
                  className="w-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table - Logic lấy từ Backend */}
        <Card className="relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 backdrop-blur-[1px]">
              <Loader2 className="size-8 animate-spin text-[#04AA6DFF]" />
            </div>
          )}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`w-[220px] ${!isAdmin ? 'hidden' : ''}`}>{t("campaignsPage.createdBy")}</TableHead>
                    <TableHead className="w-[280px]">
                      <Button variant="ghost" size="sm" className="-ml-3 h-8 font-medium" onClick={() => handleSort("name")}>
                        {t("campaignsPage.campaignName")}
                        <ArrowUpDown className="ml-2 size-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">{t("common.status")}</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="-ml-3 h-8 font-medium" onClick={() => handleSort("createdAt")}>
                        {t("campaignsPage.createAt")}
                        <ArrowUpDown className="ml-2 size-4" />
                      </Button>
                    </TableHead>
                    <TableHead>{t("campaignsPage.dateRange")}</TableHead>
                    <TableHead>{t("campaignsPage.integrations")}</TableHead>
                    <TableHead className="w-[140px] text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length > 0 ? (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="group">
                        <TableCell className={!isAdmin ? 'hidden' : ''}>
                          <div className="max-w-[220px]">
                            <p className="truncate font-medium">{campaign.creator?.username || t("common.noData")}</p>
                            <p className="truncate text-xs text-muted-foreground">{campaign.creator?.email || t("common.noData")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <p className="truncate font-medium">{campaign.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{campaign.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={campaign.status === "active" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : "border-zinc-500/50 bg-zinc-500/10 text-zinc-500"}>
                            {campaign.status === "active" ? t("campaignsPage.active") : t("campaignsPage.paused")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(campaign.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Logic hiển thị Badge tích hợp */}
                            {campaign.googleEventId || campaign.calendarSyncStatus ? (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                <CalendarCheck className="mr-1 size-3" /> {t("campaignsPage.calendar")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground opacity-50"><CalendarX className="mr-1 size-3" /> {t("campaignsPage.calendar")}</Badge>
                            )}
                            {campaign.gaMeasurementId ? (
                              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700"><CheckCircle2 className="mr-1 size-3" /> GA4</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground opacity-50"><Circle className="mr-1 size-3" /> GA4</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" asChild>
                                  <Link href={`/dashboard/campaigns/${campaign.id}`}><Eye className="size-4" /></Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Xem chi tiết</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" asChild>
                                  <Link href={`/dashboard/campaigns/${campaign.id}/edit`}><Pencil className="size-4" /></Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Chỉnh sửa</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setSelectedCampaign(campaign); setDeleteDialogOpen(true); }}>
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Xóa</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        {t("campaignsPage.noCampaigns")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </CardContent>
        </Card>

        {/* AlertDialog - Xóa thực tế */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("campaignsPage.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa chiến dịch <strong>{selectedCampaign?.name}</strong>? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Xóa ngay
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
