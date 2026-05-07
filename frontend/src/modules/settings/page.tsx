"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Lock,
  Bell,
  LogOut,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
import { useLanguage } from "@/contexts/language-context"
import { getAuthContext } from "@/apis/auth-fetch"
import { getUserById, updateUser, changePassword, type User as ApiUser } from "@/apis/users-api"
import { cacheInvalidations, queryKeys, staleTimes } from "@/lib/cache/query-client"

export interface SettingsNotificationPreferences {
  emailAlerts: boolean
  campaignUpdates: boolean
  weeklyReports: boolean
}

export type SettingsProfileData = {
  username: string
  fullName: string
  phoneNumber: string
  email: string
}

export type SettingsPasswordData = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type SettingsUser = ApiUser & {
  notifications?: SettingsNotificationPreferences
}

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const authContext = React.useMemo(() => getAuthContext(), [])
  const currentUserId = authContext.userId !== undefined && authContext.userId !== null
    ? String(authContext.userId)
    : ""

  const [isSaving, setIsSaving] = React.useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // Profile form state
  const [profileData, setProfileData] = React.useState({
    username: "",
    fullName: "",
    phoneNumber: "",
    email: "",
  })

  // Password form state
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Notification preferences
  const defaultNotifications: SettingsNotificationPreferences = {
    emailAlerts: true,
    campaignUpdates: true,
    weeklyReports: false,
  }

  const [notifications, setNotifications] = React.useState<SettingsNotificationPreferences>(
    defaultNotifications
  )

  // Track changes
  const [hasProfileChanges, setHasProfileChanges] = React.useState(false)
  const [hasPasswordChanges, setHasPasswordChanges] = React.useState(false)

  // Password error state
  const [passwordError, setPasswordError] = React.useState("")
  const [profileError, setProfileError] = React.useState("")

  // Baseline for detecting changes
  const profileBaselineRef = React.useRef<typeof profileData | null>(null)

  // Fetch user data with React Query
  const userQuery = useQuery({
    queryKey: queryKeys.users.detail(currentUserId || "current-user"),
    queryFn: () => getUserById({ userId: currentUserId }),
    enabled: Boolean(currentUserId),
    staleTime: staleTimes.staticContent,
    retry: false,
  })

  // Initialize form data when user data loads
  React.useEffect(() => {
    if (!currentUserId) return

    const loadedUser = userQuery.data?.user as SettingsUser | undefined
    if (!loadedUser) return

    const nextProfile = {
      username: loadedUser.username ?? "",
      fullName: loadedUser.fullName ?? "",
      phoneNumber: loadedUser.phoneNumber ?? "",
      email: loadedUser.email ?? "",
    }

    profileBaselineRef.current = nextProfile
    setProfileData(nextProfile)
    setNotifications({
      ...defaultNotifications,
      ...(loadedUser.notifications ?? {}),
    })
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setPasswordError("")
    setProfileError("")
  }, [currentUserId, userQuery.data])

  // Handle query errors
  React.useEffect(() => {
    if (!currentUserId) return
    if (!userQuery.isError) {
      setProfileError("")
      return
    }
    setProfileError(
      userQuery.error instanceof Error
        ? userQuery.error.message
        : "Failed to load account settings."
    )
  }, [currentUserId, userQuery.isError, userQuery.error])

  // Check for profile changes
  React.useEffect(() => {
    const baseline = profileBaselineRef.current
    if (!baseline) {
      setHasProfileChanges(false)
      return
    }

    const changed =
      profileData.username !== baseline.username ||
      profileData.fullName !== baseline.fullName ||
      profileData.phoneNumber !== baseline.phoneNumber ||
      profileData.email !== baseline.email

    setHasProfileChanges(changed)
  }, [profileData])

  // Check for password changes
  React.useEffect(() => {
    const changed =
      passwordData.currentPassword !== "" ||
      passwordData.newPassword !== "" ||
      passwordData.confirmPassword !== ""

    setHasPasswordChanges(changed)
  }, [passwordData])

  const handleProfileChange = (field: keyof typeof profileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
    setProfileError("")
  }

  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }))
    setPasswordError("")
  }

  const handleNotificationChange = (field: keyof typeof notifications, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [field]: value }))
    // Note: Notifications are client-side only for now
    // Could be persisted to backend if API supports it
  }

  const handleSaveProfile = async () => {
    if (!currentUserId) {
      setProfileError("You must be signed in to update your profile.")
      return
    }

    setIsSaving(true)
    setProfileError("")

    try {
      const updated = await updateUser({
        userId: currentUserId,
        username: profileData.username,
        fullName: profileData.fullName,
        phoneNumber: profileData.phoneNumber,
        email: profileData.email,
      })

      // Update baseline to reflect saved state
      const normalizedProfile = {
        username: updated.username,
        fullName: updated.fullName ?? "",
        phoneNumber: updated.phoneNumber ?? "",
        email: updated.email,
      }

      profileBaselineRef.current = normalizedProfile
      setProfileData(normalizedProfile)
      setHasProfileChanges(false)

      // Invalidate cache to refresh data
      cacheInvalidations.updateUser(updated.id)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to save profile changes.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentUserId) {
      setPasswordError("You must be signed in to update your password.")
      return
    }

    if (passwordData.currentPassword.trim().length === 0) {
      setPasswordError("Current password is required")
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setIsSaving(true)
    setPasswordError("")

    try {
      await changePassword({
        userId: currentUserId,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      // Reset password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setHasPasswordChanges(false)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to update password.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    router.push("/login")
  }

  // Not authenticated state
  if (!currentUserId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Unable to load settings because no signed-in user was found.</p>
        <Button onClick={() => router.push("/login")} variant="outline">
          Go to login
        </Button>
      </div>
    )
  }

  // Loading state
  if (userQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (userQuery.isError || !userQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">
          {profileError || "Unable to load settings at the moment."}
        </p>
        <Button onClick={() => router.push("/login")} variant="outline">
          Go to login
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("settings.profile")}</CardTitle>
          </div>
          <CardDescription>
            {t("settings.profileDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t("settings.username")}</Label>
              <Input
                id="username"
                value={profileData.username}
                onChange={(e) => handleProfileChange("username", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">{t("settings.fullName")}</Label>
              <Input
                id="fullName"
                value={profileData.fullName}
                onChange={(e) => handleProfileChange("fullName", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">{t("settings.phone")}</Label>
              <Input
                id="phone"
                value={profileData.phoneNumber}
                onChange={(e) => handleProfileChange("phoneNumber", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
              />
            </div>
          </div>

          {profileError && (
            <p className="mt-4 text-sm text-destructive">{profileError}</p>
          )}

          {hasProfileChanges && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("settings.saveChanges")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("settings.changePassword")}</CardTitle>
          </div>
          <CardDescription>
            {t("settings.changePasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 max-w-md">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">{t("settings.confirmNewPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}

            {hasPasswordChanges && (
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("settings.updatePassword")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("settings.notifications")}</CardTitle>
          </div>
          <CardDescription>
            {t("settings.notificationsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="emailAlerts" className="cursor-pointer">{t("settings.emailAlerts")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.emailAlertsDesc")}
                </p>
              </div>
              <Switch
                id="emailAlerts"
                checked={notifications.emailAlerts}
                onCheckedChange={(checked) => handleNotificationChange("emailAlerts", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="campaignUpdates" className="cursor-pointer">{t("settings.campaignUpdates")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.campaignUpdatesDesc")}
                </p>
              </div>
              <Switch
                id="campaignUpdates"
                checked={notifications.campaignUpdates}
                onCheckedChange={(checked) => handleNotificationChange("campaignUpdates", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="weeklyReports" className="cursor-pointer">{t("settings.weeklyReports")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.weeklyReportsDesc")}
                </p>
              </div>
              <Switch
                id="weeklyReports"
                checked={notifications.weeklyReports}
                onCheckedChange={(checked) => handleNotificationChange("weeklyReports", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{t("settings.dangerZone")}</CardTitle>
          </div>
          <CardDescription>
            {t("settings.dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{t("settings.logoutDesc")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.logoutSubDesc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("user.logout")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.logoutConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.logoutConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>
                    {t("user.logout")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
