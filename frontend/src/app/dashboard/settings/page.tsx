import SettingsPage, {
  type SettingsNotificationPreferences,
  type SettingsPasswordData,
  type SettingsProfileData,
} from "@/modules/settings/page"

export type {
  SettingsNotificationPreferences,
  SettingsPasswordData,
  SettingsProfileData,
}

export const metadata = {
  title: "Settings | Dynamic QR",
  description: "Manage your profile, password, and notification preferences",
}

export default SettingsPage

