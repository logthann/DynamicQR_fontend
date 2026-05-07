"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from 'react'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Calendar,
  ChevronUp,
  ChevronRight,
  QrCode,
  Settings,
  LogOut,
  Moon,
  Sun,
  List,
  Plus,
  FileText,
  Users,
  Cog,
  RefreshCw,
  CalendarPlus,
  Undo2,
  Languages,
  Check,
  User,
} from "lucide-react"

// --- LOGIC AUTH TỪ PROJECT CỦA BẠN ---
import { type AuthContext, getAuthContext } from '@/apis/auth-fetch'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

//
import { useLanguage } from "@/contexts/language-context"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type NavItem = {
  titleKey: string
  url?: string
  icon: React.ComponentType<{ className?: string }>
  items?: {
    titleKey: string
    url: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  adminOnly?: boolean
}

// Cập nhật URL để khớp với Project hiện tại của bạn
const navigationItems: NavItem[] = [
  {
    titleKey: "nav.dashboard",
    icon: LayoutDashboard,
    url: "/dashboard",
  },
  {
    titleKey: "nav.campaign",
    icon: Megaphone,
    items: [
      { titleKey: "nav.campaign.list", url: "/dashboard/campaigns", icon: List },
      { titleKey: "nav.campaign.create", url: "/dashboard/campaigns/create", icon: Plus },
    ],
  },
  {
    titleKey: "nav.qrcode",
    icon: QrCode,
    items: [
      { titleKey: "nav.qrcode.list", url: "/dashboard/qr", icon: List },
      { titleKey: "nav.qrcode.create", url: "/dashboard/qr/create", icon: Plus },
    ],
  },
  {
    titleKey: "nav.ggServices",
    icon: Calendar,
    items: [
      { titleKey: "nav.ggServices.setup", url: "/dashboard/integrations/setup", icon: Cog },
      { titleKey: "nav.ggServices.sync", url: "/dashboard/integrations/sync", icon: RefreshCw },
      { titleKey: "nav.ggServices.import", url: "/dashboard/integrations/import", icon: CalendarPlus },
      { titleKey: "nav.ggServices.remove", url: "/dashboard/integrations/remove", icon: Undo2 },
    ],
  },
  {
    titleKey: "nav.analytics",
    icon: BarChart3,
    url: "/dashboard/analytics",
  },
  {
    titleKey: "nav.accountManagement",
    icon: Users,
    adminOnly: true, // Sẽ dựa vào authContext.role để hiển thị
    items: [
      { titleKey: "nav.accountManagement.employees", url: "/dashboard/accounts" },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  // --- STATE AUTH TỪ PROJECT CỦA BẠN ---
  const [authContext, setAuthContextState] = useState<AuthContext>({})
  const [openMenus, setOpenMenus] = useState<string[]>(["nav.dashboard"])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setAuthContextState(getAuthContext())
    // Load saved menu state after hydration
    const saved = sessionStorage.getItem('sidebar-open-menus')
    if (saved) {
      setOpenMenus(JSON.parse(saved))
    }
    setIsHydrated(true)
  }, [])

  const user = useMemo(() => {
    const name =
      authContext.displayName ||
      authContext.fullName ||
      authContext.username ||
      authContext.email ||
      authContext.companyName ||
      'Signed in user'

    return {
      name,
      role: authContext.role || 'user',
      avatar: '',
    }
  }, [authContext])

  const isAdmin = user.role === 'admin'
  const avatarFallback = user.name.slice(0, 2).toUpperCase()

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  const handleLogout = () => {
    // Thêm logic xóa cookie/token ở đây nếu cần
    router.push("/login")
  }

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(url)
  }

  const isMenuActive = (item: NavItem) => {
    if (item.items) return item.items.some((subItem) => isActive(subItem.url))
    return item.url ? isActive(item.url) : false
  }

  const toggleMenu = (titleKey: string) => {
    setOpenMenus((prev) => {
      const newState = prev.includes(titleKey)
        ? prev.filter((t) => t !== titleKey)
        : [...prev, titleKey]
      // Persist to sessionStorage only after hydration
      if (isHydrated) {
        sessionStorage.setItem('sidebar-open-menus', JSON.stringify(newState))
      }
      return newState
    })
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <QrCode className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">DynamicQR</span>
                  <span className="truncate text-xs text-muted-foreground">Marketing Suite</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.navigation") || "Menu"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  item.items ? (
                    <Collapsible
                      key={item.titleKey}
                      open={openMenus.includes(item.titleKey)}
                      onOpenChange={() => toggleMenu(item.titleKey)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={t(item.titleKey)}
                            isActive={isMenuActive(item)}
                          >
                            <item.icon />
                            <span>{t(item.titleKey)}</span>
                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.titleKey}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                  <Link href={subItem.url}>
                                    {subItem.icon && <subItem.icon className="size-4" />}
                                    <span>{t(subItem.titleKey)}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild tooltip={t(item.titleKey)} isActive={isActive(item.url!)}>
                        <Link href={item.url!}>
                          <item.icon />
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground uppercase">{user.role}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-lg z-50"
                                   side="right"
                                   align="end"
                                   sideOffset={8}>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <User className="mr-2 size-4" /> {t("user.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 size-4" /> {t("user.settings")}
                  </Link>
                </DropdownMenuItem>

                {/* Theme & Language Toggles từ v0 */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  <Sun className="mr-2 size-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
                  <span className="ml-6">{t("user.toggleTheme")}</span>
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Languages className="mr-2 size-4" /> {t("user.switchLanguage")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setLanguage("en")}>
                        {t("user.language.en")} {language === "en" && <Check className="ml-2 size-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLanguage("vi")}>
                        {t("user.language.vi")} {language === "vi" && <Check className="ml-2 size-4" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 size-4" /> {t("user.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
