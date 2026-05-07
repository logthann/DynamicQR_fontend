"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  QrCode,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getUserById,
  updateUser,
  type UserCampaignSummary,
} from "@/apis/users-api"
import { queryKeys, staleTimes, cacheInvalidations } from "@/lib/cache/query-client"
import { useLanguage } from "@/contexts/language-context"

type Campaign = UserCampaignSummary


export default function EmployeeDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const employeeId = params.id as string

  const [showPassword, setShowPassword] = React.useState(false)

  // React Query for fetching employee data
  const employeeQuery = useQuery({
    queryKey: queryKeys.users.detail(employeeId),
    queryFn: () => getUserById({ userId: employeeId }),
    staleTime: staleTimes.users,
    retry: false,
  })

  // Extract data from query
  const employee = employeeQuery.data?.user ?? null
  const campaigns = employeeQuery.data?.campaigns ?? []
  const qrCodes = employeeQuery.data?.qrCodes ?? []
  const isLoading = employeeQuery.isLoading
  const loadError = employeeQuery.error?.message || null

  // Form state - initialized from employee data
  const [formData, setFormData] = React.useState({
    username: "",
    fullName: "",
    phoneNumber: "",
    email: "",
  })

  // Initialize form data when employee loads
  React.useEffect(() => {
    if (employee) {
      setFormData({
        username: employee.username,
        fullName: employee.fullName ?? "",
        phoneNumber: employee.phoneNumber ?? "",
        email: employee.email,
      })
    }
  }, [employee])

  // Track if there are unsaved changes
  const hasChanges = React.useMemo(() => {
    if (!employee) return false

    return (
      formData.username !== employee.username ||
      formData.fullName !== (employee.fullName ?? "") ||
      formData.phoneNumber !== (employee.phoneNumber ?? "") ||
      formData.email !== employee.email
    )
  }, [formData, employee])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      // Invalidate and refetch user data
      cacheInvalidations.updateUser(employeeId)
      // Clear password field after save
      setFormData((prev) => ({ ...prev, password: "" }))
    },
  })

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveChanges = async () => {
    if (!employee) return

    await updateMutation.mutateAsync({
      userId: employee.id,
      username: formData.username,
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
    })
  }

  const getStatusBadgeVariant = (status: Campaign["status"]) => {
    switch (status) {
      case "active":
        return "default"
      case "completed":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "secondary"
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">{loadError || t("employeeDetail.employeeNotFound")}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("employeeDetail.backToList")}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/accounts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{employee.fullName}</h1>
              <Badge
                variant={employee.role === "admin" ? "default" : "secondary"}
                className="gap-1"
              >
                {employee.role === "admin" ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <UserIcon className="h-3 w-3" />
                )}
                {employee.role === "admin" ? t("employeeDetail.admin") : t("employeeDetail.employee")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("employeeDetail.memberSince")} {new Date(employee.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Save Changes Button - Only visible when there are changes */}
        {hasChanges && (
          <Button onClick={handleSaveChanges} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("employeeDetail.saveChanges")}
          </Button>
        )}
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("employeeDetail.accountInfo")}</CardTitle>
          <CardDescription>
            {t("employeeDetail.accountInfoDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t("employeeDetail.accountName")}</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">{t("employeeDetail.fullName")}</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">{t("employeeDetail.phoneNumber")}</Label>
              <Input
                id="phone"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("employeeDetail.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Campaigns Created */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("employeeDetail.campaignsCreated")}</CardTitle>
            </div>
            <CardDescription>
              {campaigns.length} {t("employeeDetail.campaignsCount")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("employeeDetail.noCampaigns")}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("employeeDetail.campaignName")}</TableHead>
                      <TableHead>{t("employeeDetail.status")}</TableHead>
                      <TableHead className="text-right">{t("employeeDetail.created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.slice(0, 5).map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(campaign.status)}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Codes Created */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("employeeDetail.qrCodesCreated")}</CardTitle>
            </div>
            <CardDescription>
              {qrCodes.length} {t("employeeDetail.qrCodesCount")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qrCodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("employeeDetail.noQRCodes")}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("employeeDetail.qrCodeName")}</TableHead>
                      <TableHead className="text-center">{t("employeeDetail.scans")}</TableHead>
                      <TableHead className="text-right">{t("employeeDetail.created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qrCodes.slice(0, 5).map((qr) => (
                      <TableRow key={qr.id}>
                        <TableCell className="font-medium">{qr.name}</TableCell>
                        <TableCell className="text-center">{qr.scans.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(qr.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
