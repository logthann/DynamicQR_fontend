"use client"

import * as React from "react"
import Link from "next/link"
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    ArrowLeft,
    Calendar,
    FileText,
    BarChart3,
    Link2,
    Plus,
    AlertTriangle,
    Check,
    RefreshCw,
    Download,
    ExternalLink,
    ChevronDown,
    QrCode,
    Eye,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
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

// Mock campaign data
const campaignData = {
    id: 16,
    name: "long",
    status: "active",
    startDate: "2026-04-13",
    endDate: "2026-04-21",
    description: "0000",
    ga4Config: null,
    integrations: {
        calendar: { connected: true, synced: false },
        analytics: { connected: true },
    },
}

// Mock QR codes data
const qrCodesData = [
    {
        id: "1",
        name: "đasd",
        type: "url",
        active: true,
        trackingEnabled: true,
        utmSource: "dynamic_qr",
        utmMedium: "scan",
        utmCampaign: "đasd",
        createdAt: "4/17/2026",
        destinationUrl: "https://translate.google.com",
    },
]

export default function CampaignDetailPage() {
    const [createQrOpen, setCreateQrOpen] = React.useState(false)
    const [editCampaignOpen, setEditCampaignOpen] = React.useState(false)
    const [editQrOpen, setEditQrOpen] = React.useState(false)
    const [viewQrOpen, setViewQrOpen] = React.useState(false)
    const [selectedQr, setSelectedQr] = React.useState<typeof qrCodesData[0] | null>(null)
    const [ga4Mode, setGa4Mode] = React.useState<"oauth" | "default">("oauth")
    const [qrCodes, setQrCodes] = React.useState(qrCodesData)

    // Custom tracking code state
    const [customTrackingCode, setCustomTrackingCode] = React.useState("")

    // Edit QR form state
    const [editQrName, setEditQrName] = React.useState("")
    const [editQrUrl, setEditQrUrl] = React.useState("")
    const [editQrType, setEditQrType] = React.useState("url")
    const [editTrackingEnabled, setEditTrackingEnabled] = React.useState(true)
    const [editTrackingSource, setEditTrackingSource] = React.useState("campaign")
    const [editCustomTrackingCode, setEditCustomTrackingCode] = React.useState("")
    const [editUtmSource, setEditUtmSource] = React.useState("dynamic_qr")
    const [editUtmMedium, setEditUtmMedium] = React.useState("scan")
    const [editSyncUtmCampaign, setEditSyncUtmCampaign] = React.useState(true)
    const [editUtmCampaign, setEditUtmCampaign] = React.useState("")
    const [editUtmOpen, setEditUtmOpen] = React.useState(false)

    // Campaign edit form state
    const [editName, setEditName] = React.useState(campaignData.name)
    const [editDescription, setEditDescription] = React.useState(campaignData.description)
    const [editStartDate, setEditStartDate] = React.useState(campaignData.startDate)
    const [editEndDate, setEditEndDate] = React.useState(campaignData.endDate)

    // Form state for new QR
    const [newQrName, setNewQrName] = React.useState("")
    const [newQrUrl, setNewQrUrl] = React.useState("")
    const [newQrType, setNewQrType] = React.useState("url")
    const [trackingEnabled, setTrackingEnabled] = React.useState(true)
    const [trackingSource, setTrackingSource] = React.useState("campaign")
    const [utmSource, setUtmSource] = React.useState("dynamic_qr")
    const [utmMedium, setUtmMedium] = React.useState("scan")
    const [syncUtmCampaign, setSyncUtmCampaign] = React.useState(true)
    const [utmCampaign, setUtmCampaign] = React.useState("")
    const [utmOpen, setUtmOpen] = React.useState(false)

    const activeQrCount = qrCodes.filter((qr) => qr.active).length

    const handleCreateQr = () => {
        const newQr = {
            id: String(Date.now()),
            name: newQrName,
            type: newQrType,
            active: true,
            trackingEnabled,
            utmSource,
            utmMedium,
            utmCampaign: syncUtmCampaign ? newQrName : utmCampaign,
            createdAt: new Date().toLocaleDateString(),
            destinationUrl: newQrUrl,
        }
        setQrCodes([...qrCodes, newQr])
        setCreateQrOpen(false)
        // Reset form
        setNewQrName("")
        setNewQrUrl("")
        setNewQrType("url")
        setTrackingEnabled(true)
        setTrackingSource("campaign")
    }

    const handleDeleteQr = (id: string) => {
        setQrCodes(qrCodes.filter((qr) => qr.id !== id))
    }

    const handleEditQr = (qr: typeof qrCodesData[0]) => {
        setSelectedQr(qr)
        setEditQrName(qr.name)
        setEditQrUrl(qr.destinationUrl)
        setEditQrType(qr.type)
        setEditTrackingEnabled(qr.trackingEnabled)
        setEditTrackingSource("campaign") // Default to campaign
        setEditCustomTrackingCode("")
        setEditUtmSource(qr.utmSource)
        setEditUtmMedium(qr.utmMedium)
        setEditUtmCampaign(qr.utmCampaign)
        setEditSyncUtmCampaign(qr.utmCampaign === qr.name)
        setEditUtmOpen(false)
        setEditQrOpen(true)
    }

    const handleSaveEditQr = () => {
        if (selectedQr) {
            setQrCodes(qrCodes.map((qr) =>
                qr.id === selectedQr.id
                    ? {
                        ...qr,
                        name: editQrName,
                        destinationUrl: editQrUrl,
                        type: editQrType,
                        trackingEnabled: editTrackingEnabled,
                        utmSource: editUtmSource,
                        utmMedium: editUtmMedium,
                        utmCampaign: editSyncUtmCampaign ? editQrName : editUtmCampaign,
                    }
                    : qr
            ))
        }
        setEditQrOpen(false)
        setSelectedQr(null)
    }

    const handleViewQr = (qr: typeof qrCodesData[0]) => {
        setSelectedQr(qr)
        setViewQrOpen(true)
    }

    const urlPreview = React.useMemo(() => {
        if (!newQrUrl) return ""
        try {
            const url = new URL(newQrUrl.startsWith("http") ? newQrUrl : `https://${newQrUrl}`)
            const params = new URLSearchParams()
            if (utmSource) params.set("utm_source", utmSource)
            if (utmMedium) params.set("utm_medium", utmMedium)
            if (syncUtmCampaign && newQrName) params.set("utm_campaign", newQrName)
            else if (utmCampaign) params.set("utm_campaign", utmCampaign)
            return `${url.origin}${url.pathname}?${params.toString()}`
        } catch {
            return ""
        }
    }, [newQrUrl, utmSource, utmMedium, syncUtmCampaign, newQrName, utmCampaign])

    const editUrlPreview = React.useMemo(() => {
        if (!editQrUrl) return ""
        try {
            const url = new URL(editQrUrl.startsWith("http") ? editQrUrl : `https://${editQrUrl}`)
            const params = new URLSearchParams()
            if (editUtmSource) params.set("utm_source", editUtmSource)
            if (editUtmMedium) params.set("utm_medium", editUtmMedium)
            if (editSyncUtmCampaign && editQrName) params.set("utm_campaign", editQrName)
            else if (editUtmCampaign) params.set("utm_campaign", editUtmCampaign)
            return `${url.origin}${url.pathname}?${params.toString()}`
        } catch {
            return ""
        }
    }, [editQrUrl, editUtmSource, editUtmMedium, editSyncUtmCampaign, editQrName, editUtmCampaign])

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{campaignData.name}</h1>
                            <span className="text-sm text-muted-foreground">(ID: {campaignData.id})</span>
                            <Badge
                                variant="outline"
                                className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            >
                                ACTIVE
                            </Badge>
                        </div>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Settings
                            <MoreHorizontal className="ml-2 size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setEditCampaignOpen(true)}>
                            <Pencil className="mr-2 size-4" />
                            Edit Campaign
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/campaigns">
                                <ArrowLeft className="mr-2 size-4" />
                                Back to Dashboard
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete Campaign
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete this campaign? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Edit Campaign Dialog */}
            <Dialog open={editCampaignOpen} onOpenChange={setEditCampaignOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Campaign</DialogTitle>
                        <DialogDescription>
                            Update campaign details. Click save when you&apos;re done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Campaign Name</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter campaign name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Enter campaign description"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-start-date">Start Date</Label>
                                <Input
                                    id="edit-start-date"
                                    type="date"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-end-date">End Date</Label>
                                <Input
                                    id="edit-end-date"
                                    type="date"
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCampaignOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => setEditCampaignOpen(false)}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Campaign Information Section - Asymmetric 2-Column Layout */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column (Primary Info) - 2/3 width */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">Campaign Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Timeline - Single line horizontal layout */}
                        <div className="flex items-center gap-3">
                            <Calendar className="size-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Timeline:</span>
                            <span className="text-sm text-muted-foreground">
                {new Date(campaignData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm text-muted-foreground">
                {new Date(campaignData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
                        </div>

                        {/* Description - Clean text block */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <FileText className="size-5 text-muted-foreground" />
                                <span className="text-sm font-medium">Description</span>
                            </div>
                            <p className="pl-7 text-sm leading-relaxed text-muted-foreground">
                                {campaignData.description || "No description provided."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column (System Status) - 1/3 width - Card within Card style */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold">Status</CardTitle>
                            {/* Active Tracking Badge at top */}
                            <Badge
                                variant="secondary"
                                className={campaignData.ga4Config ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : "text-amber-500"}
                            >
                                <BarChart3 className="mr-1.5 size-3" />
                                {campaignData.ga4Config ? "Tracking Active" : "No Tracking"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col space-y-4">
                        {/* Integrations List */}
                        <div className="space-y-3">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Integrations</span>

                            {/* Google Calendar Row */}
                            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="size-4 text-muted-foreground" />
                                    <span className="text-sm">Google Calendar</span>
                                </div>
                                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500 text-xs">
                                    Connected
                                </Badge>
                            </div>

                            {/* Google Analytics Row */}
                            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="size-4 text-muted-foreground" />
                                    <span className="text-sm">Google Analytics</span>
                                </div>
                                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500 text-xs">
                                    Connected
                                </Badge>
                            </div>
                        </div>

                        {/* Spacer to push sync alert to bottom */}
                        <div className="flex-1" />

                        {/* Sync Alert - at bottom of sidebar */}
                        {campaignData.integrations.calendar.connected && !campaignData.integrations.calendar.synced && (
                            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    <span className="text-sm font-medium text-amber-500">Sync Required</span>
                                </div>
                                <p className="text-xs text-amber-500/80">
                                    Calendar events need to be synchronized with Google Calendar.
                                </p>
                                <Button size="sm" variant="outline" className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                                    <RefreshCw className="mr-2 size-3" />
                                    Sync to Google Calendar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* GA4 Tracking Configuration Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Google Analytics 4 Configuration</CardTitle>
                    <CardDescription>
                        Configure GA4 tracking for this campaign
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <RadioGroup value={ga4Mode} onValueChange={(v) => setGa4Mode(v as "oauth" | "default")}>
                        <div className="space-y-4">
                            {/* OAuth Option */}
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="oauth" id="oauth" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="oauth" className="flex items-center gap-2 font-medium">
                                        Use Connected Account
                                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Load GA4 properties via backend &apos;GET /api/v1/ga4/properties&apos; using your app JWT + stored OAuth token.
                                    </p>
                                    {ga4Mode === "oauth" && (
                                        <div className="space-y-3 pt-2">
                                            <Select>
                                                <SelectTrigger className="w-full max-w-md">
                                                    <SelectValue placeholder="Select GA4 property..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="prop1">Property 1</SelectItem>
                                                    <SelectItem value="prop2">Property 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                                                <AlertTriangle className="size-4 text-destructive" />
                                                <span className="text-sm text-destructive">
                          Unable to load GA4 properties. Check OAuth Analytics scope and backend &apos;/ga4/properties&apos;.
                        </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Default Option */}
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="default" id="default" className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="default" className="font-medium">GA4 default</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Set a campaign default tracking code (you can still override per QR).
                                    </p>
                                    {ga4Mode === "default" && (
                                        <Input
                                            placeholder="Enter GA4 Measurement ID (e.g., G-XXXXXXXXXX)"
                                            className="mt-2 max-w-md"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </RadioGroup>

                    <Button className="mt-4">Save GA4 Settings</Button>
                </CardContent>
            </Card>

            {/* QR Code Management Section */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle>QR Codes</CardTitle>
                            <span className="text-2xl font-bold text-muted-foreground">
                {activeQrCount} items active
              </span>
                        </div>
                        <Dialog open={createQrOpen} onOpenChange={setCreateQrOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 size-4" />
                                    Create New QR
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
                                <DialogHeader className="flex-shrink-0">
                                    <DialogTitle>Create New QR Code</DialogTitle>
                                    <DialogDescription>
                                        Add a new QR code to this campaign
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 space-y-6 overflow-y-auto py-4">
                                    {/* Primary Inputs */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="qr-name">QR Name</Label>
                                            <Input
                                                id="qr-name"
                                                placeholder="e.g., Translate Tool"
                                                value={newQrName}
                                                onChange={(e) => setNewQrName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="qr-url">Destination URL</Label>
                                            <Input
                                                id="qr-url"
                                                placeholder="e.g., translate.google.com"
                                                value={newQrUrl}
                                                onChange={(e) => setNewQrUrl(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="qr-type">URL Type</Label>
                                            <Select value={newQrType} onValueChange={setNewQrType}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="url">url</SelectItem>
                                                    <SelectItem value="dynamic">dynamic</SelectItem>
                                                    <SelectItem value="vcard">vcard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Tracking Settings */}
                                    <div className="space-y-4 rounded-lg border p-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-medium">Tracking settings</Label>
                                            <Badge variant="secondary" className="text-amber-500">
                                                Active tracking: {campaignData.ga4Config ? "Configured" : "Not configured"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="tracking-enabled"
                                                checked={trackingEnabled}
                                                onCheckedChange={(checked) => setTrackingEnabled(checked as boolean)}
                                            />
                                            <Label htmlFor="tracking-enabled">Enable tracking for this QR</Label>
                                        </div>
                                        {trackingEnabled && (
                                            <RadioGroup value={trackingSource} onValueChange={setTrackingSource} className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="campaign" id="tracking-campaign" />
                                                    <Label htmlFor="tracking-campaign">Use campaign tracking code</Label>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="custom" id="tracking-custom" />
                                                        <Label htmlFor="tracking-custom">Use custom tracking code for this QR</Label>
                                                    </div>
                                                    {trackingSource === "custom" && (
                                                        <div className="ml-6">
                                                            <Input
                                                                placeholder="Enter custom GA4 code (e.g., G-XXXXXXXXXX)"
                                                                value={customTrackingCode}
                                                                onChange={(e) => setCustomTrackingCode(e.target.value)}
                                                                className="max-w-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <RadioGroupItem value="auto" id="tracking-auto" />
                                                    <Label htmlFor="tracking-auto">Auto-detect from destination URL</Label>
                                                    <Button size="sm" variant="outline" className="ml-auto h-7 text-xs">
                                                        Detect GA4 Code
                                                    </Button>
                                                </div>
                                            </RadioGroup>
                                        )}
                                    </div>

                                    {/* UTM Parameters (Collapsible) */}
                                    <Collapsible open={utmOpen} onOpenChange={setUtmOpen}>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" className="flex w-full justify-between px-0">
                                                <span className="font-medium">UTM Settings</span>
                                                <ChevronDown className={`size-4 transition-transform ${utmOpen ? "rotate-180" : ""}`} />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-4 pt-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="utm-source">UTM Source</Label>
                                                    <Input
                                                        id="utm-source"
                                                        value={utmSource}
                                                        onChange={(e) => setUtmSource(e.target.value)}
                                                        placeholder="dynamic_qr"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="utm-medium">UTM Medium</Label>
                                                    <Input
                                                        id="utm-medium"
                                                        value={utmMedium}
                                                        onChange={(e) => setUtmMedium(e.target.value)}
                                                        placeholder="scan"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="sync-utm"
                                                    checked={syncUtmCampaign}
                                                    onCheckedChange={(checked) => setSyncUtmCampaign(checked as boolean)}
                                                />
                                                <Label htmlFor="sync-utm">Sync utm_campaign with QR name</Label>
                                            </div>
                                            {!syncUtmCampaign && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="utm-campaign">UTM Campaign</Label>
                                                    <Input
                                                        id="utm-campaign"
                                                        value={utmCampaign}
                                                        onChange={(e) => setUtmCampaign(e.target.value)}
                                                        placeholder="Enter UTM campaign"
                                                    />
                                                </div>
                                            )}
                                            {urlPreview && (
                                                <div className="rounded-md border bg-muted/50 p-3">
                                                    <Label className="text-xs text-muted-foreground">URL Preview</Label>
                                                    <p className="mt-1 break-all text-xs font-mono">{urlPreview}</p>
                                                </div>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>

                                <DialogFooter className="flex-shrink-0 border-t pt-4">
                                    <Button variant="outline" onClick={() => setCreateQrOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateQr} disabled={!newQrName || !newQrUrl}>
                                        Create QR
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>

                {/* Edit QR Dialog - Full form matching Create QR */}
                <Dialog open={editQrOpen} onOpenChange={setEditQrOpen}>
                    <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
                        <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Edit QR Code</DialogTitle>
                            <DialogDescription>
                                Update the QR code details and tracking settings
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 space-y-6 overflow-y-auto py-4">
                            {/* Primary Inputs */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-qr-name">QR Name</Label>
                                    <Input
                                        id="edit-qr-name"
                                        placeholder="e.g., Translate Tool"
                                        value={editQrName}
                                        onChange={(e) => setEditQrName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-qr-url">Destination URL</Label>
                                    <Input
                                        id="edit-qr-url"
                                        placeholder="e.g., translate.google.com"
                                        value={editQrUrl}
                                        onChange={(e) => setEditQrUrl(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-qr-type">URL Type</Label>
                                    <Select value={editQrType} onValueChange={setEditQrType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="url">url</SelectItem>
                                            <SelectItem value="dynamic">dynamic</SelectItem>
                                            <SelectItem value="vcard">vcard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Tracking Settings */}
                            <div className="space-y-4 rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-medium">Tracking settings</Label>
                                    <Badge variant="secondary" className="text-amber-500">
                                        Active tracking: {campaignData.ga4Config ? "Configured" : "Not configured"}
                                    </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-tracking-enabled"
                                        checked={editTrackingEnabled}
                                        onCheckedChange={(checked) => setEditTrackingEnabled(checked as boolean)}
                                    />
                                    <Label htmlFor="edit-tracking-enabled">Enable tracking for this QR</Label>
                                </div>
                                {editTrackingEnabled && (
                                    <RadioGroup value={editTrackingSource} onValueChange={setEditTrackingSource} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="campaign" id="edit-tracking-campaign" />
                                            <Label htmlFor="edit-tracking-campaign">Use campaign tracking code</Label>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="custom" id="edit-tracking-custom" />
                                                <Label htmlFor="edit-tracking-custom">Use custom tracking code for this QR</Label>
                                            </div>
                                            {editTrackingSource === "custom" && (
                                                <div className="ml-6">
                                                    <Input
                                                        placeholder="Enter custom GA4 code (e.g., G-XXXXXXXXXX)"
                                                        value={editCustomTrackingCode}
                                                        onChange={(e) => setEditCustomTrackingCode(e.target.value)}
                                                        className="max-w-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="auto" id="edit-tracking-auto" />
                                            <Label htmlFor="edit-tracking-auto">Auto-detect from destination URL</Label>
                                            <Button size="sm" variant="outline" className="ml-auto h-7 text-xs">
                                                Detect GA4 Code
                                            </Button>
                                        </div>
                                    </RadioGroup>
                                )}
                            </div>

                            {/* UTM Parameters (Collapsible) */}
                            <Collapsible open={editUtmOpen} onOpenChange={setEditUtmOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="flex w-full justify-between px-0">
                                        <span className="font-medium">UTM Settings</span>
                                        <ChevronDown className={`size-4 transition-transform ${editUtmOpen ? "rotate-180" : ""}`} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-4 pt-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-utm-source">UTM Source</Label>
                                            <Input
                                                id="edit-utm-source"
                                                value={editUtmSource}
                                                onChange={(e) => setEditUtmSource(e.target.value)}
                                                placeholder="dynamic_qr"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-utm-medium">UTM Medium</Label>
                                            <Input
                                                id="edit-utm-medium"
                                                value={editUtmMedium}
                                                onChange={(e) => setEditUtmMedium(e.target.value)}
                                                placeholder="scan"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="edit-sync-utm"
                                            checked={editSyncUtmCampaign}
                                            onCheckedChange={(checked) => setEditSyncUtmCampaign(checked as boolean)}
                                        />
                                        <Label htmlFor="edit-sync-utm">Sync utm_campaign with QR name</Label>
                                    </div>
                                    {!editSyncUtmCampaign && (
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-utm-campaign">UTM Campaign</Label>
                                            <Input
                                                id="edit-utm-campaign"
                                                value={editUtmCampaign}
                                                onChange={(e) => setEditUtmCampaign(e.target.value)}
                                                placeholder="Enter UTM campaign"
                                            />
                                        </div>
                                    )}
                                    {editUrlPreview && (
                                        <div className="rounded-md border bg-muted/50 p-3">
                                            <Label className="text-xs text-muted-foreground">URL Preview</Label>
                                            <p className="mt-1 break-all text-xs font-mono">{editUrlPreview}</p>
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        <DialogFooter className="flex-shrink-0 border-t pt-4">
                            <Button variant="outline" onClick={() => setEditQrOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEditQr} disabled={!editQrName || !editQrUrl}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View QR Code Dialog */}
                <Dialog open={viewQrOpen} onOpenChange={setViewQrOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>QR Code Preview</DialogTitle>
                            <DialogDescription>
                                {selectedQr?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-6">
                            {/* QR Code Placeholder - In production, use a QR code library */}
                            <div className="flex size-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                                <QrCode className="size-24 text-muted-foreground" />
                            </div>
                            <div className="w-full space-y-2 text-center">
                                <p className="text-sm font-medium">{selectedQr?.name}</p>
                                <p className="break-all text-xs text-muted-foreground">
                                    {selectedQr?.destinationUrl}
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="flex-col gap-2 sm:flex-col">
                            <Button className="w-full">
                                <Download className="mr-2 size-4" />
                                Download PNG
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => setViewQrOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <CardContent>
                    {qrCodes.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>QR Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Active</TableHead>
                                        <TableHead>Tracking Status</TableHead>
                                        <TableHead>UTM</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {qrCodes.map((qr) => (
                                        <TableRow key={qr.id}>
                                            <TableCell className="font-medium">{qr.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{qr.type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Switch checked={qr.active} />
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        qr.trackingEnabled
                                                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                                                            : "border-muted text-muted-foreground"
                                                    }
                                                >
                                                    GA4: {qr.trackingEnabled ? "Enabled" : "Disabled"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {qr.utmSource} / {qr.utmMedium} / {qr.utmCampaign}
                                            </TableCell>
                                            <TableCell>{qr.createdAt}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-8">
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleViewQr(qr)}>
                                                            <Eye className="mr-2 size-4" />
                                                            See QR Code
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleEditQr(qr)}>
                                                            <Pencil className="mr-2 size-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Download className="mr-2 size-4" />
                                                            Download PNG
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <ExternalLink className="mr-2 size-4" />
                                                            Open Redirect URL
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => handleDeleteQr(qr.id)}
                                                        >
                                                            <Trash2 className="mr-2 size-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                                <Plus className="size-6 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">No QR codes yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Create your first QR code for this campaign.
                            </p>
                            <Button className="mt-4" onClick={() => setCreateQrOpen(true)}>
                                <Plus className="mr-2 size-4" />
                                Create New QR
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
import { CreateCampaignForm } from '@/components/dashboard/create-campaign-form'

export default function CreateCampaignPage() {
    return <CreateCampaignForm />
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Megaphone, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { DateRangePicker } from './date-range-picker'

const campaignFormSchema = z.object({
    name: z.string().min(3, {
        message: 'Campaign name must be at least 3 characters.',
    }),
    description: z.string().optional(),
    status: z.enum(['active', 'paused', 'draft'], {
        errorMap: () => ({ message: 'Please select a valid status.' }),
    }),
    startDate: z.string().min(1, { message: 'Start date is required.' }),
    endDate: z.string().min(1, { message: 'End date is required.' }),
})

type CampaignFormValues = z.infer<typeof campaignFormSchema>

export function CreateCampaignForm() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<CampaignFormValues>({
        resolver: zodResolver(campaignFormSchema),
        defaultValues: {
            name: '',
            description: '',
            status: 'draft',
            startDate: '',
            endDate: '',
        },
    })

    async function onSubmit(values: CampaignFormValues) {
        setIsSubmitting(true)
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000))
            console.log('Campaign created:', values)
            router.push('/dashboard/campaigns')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl py-8">
            <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-1 border-b bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="text-3xl font-bold">Create Campaign</CardTitle>
                    <CardDescription className="text-base">
                        Set up a new QR code marketing campaign. Fill in the details below to get started.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Name and Status Row */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Campaign Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 text-base font-semibold">
                                                <Megaphone className="size-4" />
                                                Campaign Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., Summer Sale 2024"
                                                    {...field}
                                                    className="h-10"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                A memorable name for your campaign
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Status */}
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-semibold">Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Select a status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="paused">Paused</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Campaign visibility status</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Date Range */}
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field: startField }) => (
                                    <FormField
                                        control={form.control}
                                        name="endDate"
                                        render={({ field: endField }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 text-base font-semibold">
                                                    <Calendar className="size-4" />
                                                    Campaign Date Range
                                                </FormLabel>
                                                <FormControl>
                                                    <DateRangePicker
                                                        startDate={startField.value}
                                                        endDate={endField.value}
                                                        onDateRangeChange={(start, end) => {
                                                            startField.onChange(start)
                                                            endField.onChange(end)
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    When should your campaign run?
                                                </FormDescription>
                                                {form.formState.errors.startDate && (
                                                    <FormMessage>{form.formState.errors.startDate.message}</FormMessage>
                                                )}
                                                {form.formState.errors.endDate && (
                                                    <FormMessage>{form.formState.errors.endDate.message}</FormMessage>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-base font-semibold">
                                            <FileText className="size-4" />
                                            Description
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add campaign details, goals, target audience, or any special instructions..."
                                                {...field}
                                                className="min-h-24 resize-none"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Optional. Provide context and details about your campaign.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Action Buttons */}
                            <div className="flex gap-3 border-t pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/dashboard/campaigns')}
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Campaign'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
