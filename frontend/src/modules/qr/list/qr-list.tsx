"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getQRs, deleteQR } from '@/apis/qr-api'
import { getAuthContext } from '@/apis/auth-fetch'
import { queryKeys, staleTimes } from '@/lib/cache/query-client'

import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ArrowUpDown,
  Filter,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { TablePagination } from "@/components/ui/table-pagination"
import { useLanguage } from "@/contexts/language-context"
import QRCodePreview from '@/modules/qr/shared/qr-code-preview'

// Mapping type từ API thực tế
import type { QRCode } from '@/apis/generated/types'

export default function QRCodesListPage() {
  const { t } = useLanguage()
  const isAdmin = getAuthContext().role === "admin"

  // QR data includes employee and campaign info from API (admin gets enriched data)

  // --- LOGIC LẤY DỮ LIỆU THỰC TẾ ---
  const qrQuery = useQuery({
    queryKey: queryKeys.qr.list(),
    queryFn: () => getQRs(),
    staleTime: staleTimes.campaigns,
  })

  const rawQrCodes = (qrQuery.data?.qrCodes as QRCode[]) || []

  // States cho UI/UX (v0)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [campaignFilter, setCampaignFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [sortConfig, setSortConfig] = React.useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)

  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [viewQrOpen, setViewQrOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedQr, setSelectedQr] = React.useState<QRCode | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const queryClient = useQueryClient()

  // --- CAMPAIGN FILTER LIST ---
  // Build campaign options from QR data (API now includes campaign info for admin)
  const campaignOptions = React.useMemo(() => {
    const uniqueCampaigns = new Map<string, string>()
    rawQrCodes.forEach(qr => {
      if (qr.campaignId && qr.campaign?.name) {
        uniqueCampaigns.set(qr.campaignId, qr.campaign.name)
      } else if (qr.campaignId) {
        uniqueCampaigns.set(qr.campaignId, `${t("campaigns.title")} ${qr.campaignId}`)
      }
    })
    return [
      { id: "all", name: t("qrcodesPage.allCampaigns") },
      ...Array.from(uniqueCampaigns.entries()).map(([id, name]) => ({ id, name }))
    ]
  }, [rawQrCodes, t])

  // --- LOGIC LỌC & SẮP XẾP (v0 UX) ---
  const filteredQrCodes = React.useMemo(() => {
    let filtered = [...rawQrCodes]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (qr) =>
          qr.name?.toLowerCase().includes(query) ||
          qr.destination_url.toLowerCase().includes(query) ||
          qr.shortCode.toLowerCase().includes(query)
      )
    }

    if (campaignFilter !== "all") {
      filtered = filtered.filter((qr) => qr.campaignId === campaignFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((qr) => qr.status === statusFilter)
    }

    if (startDate) {
      filtered = filtered.filter((qr) => new Date(qr.createdAt) >= new Date(startDate))
    }
    if (endDate) {
      filtered = filtered.filter((qr) => new Date(qr.createdAt) <= new Date(endDate))
    }

    if (sortConfig) {
      filtered.sort((a: any, b: any) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [rawQrCodes, searchQuery, campaignFilter, statusFilter, startDate, endDate, sortConfig])

  const paginatedQrCodes = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredQrCodes.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredQrCodes, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredQrCodes.length / rowsPerPage)

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows)
    setCurrentPage(1)
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc"
    }))
  }

  const handleCopyLink = async (qr: QRCode) => {
    await navigator.clipboard.writeText(qr.destination_url)
    setCopiedId(qr.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async () => {
    if (!selectedQr?.id) return
    try {
      await deleteQR({ qrId: selectedQr.id })
      // Invalidate and refetch QR list
      queryClient.invalidateQueries({ queryKey: queryKeys.qr.list() })
      setDeleteDialogOpen(false)
      setSelectedQr(null)
    } catch (error) {
      console.error('Failed to delete QR:', error)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "--/--/--"
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" })
  }

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("qrcodesPage.title") || "QR Codes"}</h1>
            <p className="text-sm text-muted-foreground">{t("qrcodesPage.subtitle") || "Quản lý vòng đời mã QR của bạn"}</p>
          </div>
          <Button asChild className="bg-[#04AA6DFF] hover:bg-[#038e5b]">
            <Link href="dashboard/qr/create">
              <Plus className="mr-2 size-4" />
              {t("qrcodesPage.createQRCode") || "Tạo mã QR"}
            </Link>
          </Button>
        </div>

        {/* Toolbox */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("qrcodesPage.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={campaignFilter} onValueChange={(v) => { setCampaignFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 size-4" />
                    <SelectValue placeholder={t("qrcodesPage.campaign")} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="active">{t("common.active")}</SelectItem>
                    <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select>

                <DateRangePicker
                  onChange={(range: { from?: Date; to?: Date } | undefined) => {
                    setStartDate(range?.from ? range.from.toISOString().split('T')[0] : "")
                    setEndDate(range?.to ? range.to.toISOString().split('T')[0] : "")
                    setCurrentPage(1)
                  }}
                  className="w-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Container */}
        <Card className="relative min-h-[400px]">
          {qrQuery.isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 backdrop-blur-[1px]">
              <Loader2 className="size-8 animate-spin text-[#04AA6DFF]" />
            </div>
          )}

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`w-[180px] ${!isAdmin ? 'hidden' : ''}`}>{t("qrcodesPage.createdBy") || "Created By"}</TableHead>
                    <TableHead className="w-[250px]">
                      <Button variant="ghost" size="sm" className="-ml-3 h-8 font-medium" onClick={() => handleSort("name")}>
                        {t("qrcodesPage.qrCodeName") || "Tên mã QR"}
                        <ArrowUpDown className="ml-2 size-4" />
                      </Button>
                    </TableHead>
                    <TableHead>{t("qrcodesPage.campaign")}</TableHead>
                    <TableHead>{t("qrcodesPage.destinationUrl")}</TableHead>
                    <TableHead className="text-center">{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("qrcodesPage.scans")}</TableHead>
                    <TableHead>{t("qrcodesPage.created")}</TableHead>
                    <TableHead className="w-[200px] text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQrCodes.length > 0 ? (
                    paginatedQrCodes.map((qr) => (
                      <TableRow key={qr.id} className="group">
                        <TableCell className={!isAdmin ? 'hidden' : ''}>
                          <div className="max-w-[180px]">
                            <p className="truncate font-medium">{qr.employee?.username || t("common.noData")}</p>
                            <p className="truncate text-xs text-muted-foreground">{qr.employee?.email || t("common.noData")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <p className="font-medium">{qr.name || `/q/${qr.shortCode}`}</p>
                            <p className="text-xs text-muted-foreground">{qr.shortCode || t("common.noDescription")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {qr.campaignId ? (
                              <Link href={`/dashboard/campaigns/${qr.campaignId}`} className="text-sm text-primary hover:underline">
                                {qr.campaign?.name || `${t("campaigns.title")} ${qr.campaignId}`}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">---</span>
                            )}
                            {qr.campaignId && qr.campaign?.description && (
                              <p className="text-xs text-muted-foreground">{qr.campaign.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[200px] items-center gap-2">
                            <span className="truncate text-sm text-muted-foreground">{qr.destination_url}</span>
                            <a href={qr.destination_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={(qr.status || 'active') === "active" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : "border-zinc-500/50 bg-zinc-500/10 text-zinc-500"}>
                            {qr.status === "active" ? t("common.active") : t("common.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium">---</p> {/* Metric này thường lấy từ Analytics API */}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{formatDate(qr.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedQr(qr); setViewQrOpen(true); }}><Eye className="size-4" /></Button>
                            </TooltipTrigger><TooltipContent>{t("qrcodesPage.viewQRCode")}</TooltipContent></Tooltip>

                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" asChild><Link href={`/dashboard/qr/${qr.id}/edit`}><Pencil className="size-4" /></Link></Button>
                            </TooltipTrigger><TooltipContent>{t("common.edit")}</TooltipContent></Tooltip>

                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedQr(qr); setDeleteDialogOpen(true); }}><Trash2 className="size-4" /></Button>
                            </TooltipTrigger><TooltipContent>{t("common.delete")}</TooltipContent></Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !qrQuery.isLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{t("common.noData")}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={currentPage} totalPages={totalPages}
              totalItems={filteredQrCodes.length} rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage} onRowsPerPageChange={handleRowsPerPageChange}
            />
          </CardContent>
        </Card>

        {/* View QR Dialog */}
        <Dialog open={viewQrOpen} onOpenChange={setViewQrOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedQr?.name || t("qrcodes.title")}</DialogTitle>
              <DialogDescription>{t("qrcodesPage.scanQr")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {selectedQr?.shortCode ? (
                <QRCodePreview
                  shortCode={selectedQr.shortCode}
                  fileLabel={selectedQr.name || selectedQr.shortCode}
                  size={256}
                  className="w-full"
                />
              ) : (
                <div className="flex size-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <QrCode className="size-32 text-muted-foreground" />
                </div>
              )}
              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("qrcodes.destination")}:</span>
                  <span className="max-w-[200px] truncate text-primary">{selectedQr?.destination_url}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => selectedQr && handleCopyLink(selectedQr)}>
                {copiedId === selectedQr?.id ? <><Check className="mr-2 size-4" /> {t("qrcodesPage.copied")}</> : <><Copy className="mr-2 size-4" /> {t("qrcodesPage.copyLink")}</>}
              </Button>
              {selectedQr?.shortCode && (
                <Button variant="outline" asChild>
                  <a href={`/q/${selectedQr.shortCode}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 size-4" /> Open Link
                  </a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("qrcodesPage.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("qrcodesPage.deleteConfirm")} {t("qrcodesPage.deleteWarning")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
