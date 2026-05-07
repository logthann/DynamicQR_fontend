"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

// Pages where the header should be hidden
const headerHiddenPaths = [
  "/dashboard/campaigns/create",
  "/dashboard/qr/create",
]

export default function DashboardLayout({
                                          children,
                                        }: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideHeader = headerHiddenPaths.includes(pathname)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {!hideHeader && <DashboardHeader />}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
