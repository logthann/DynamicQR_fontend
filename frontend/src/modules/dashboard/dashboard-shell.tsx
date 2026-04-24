'use client';

import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  BarChart3,
  Calendar,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import IntegrationsDashboard from '../integrations/calendar/integrations-dashboard';
import { type AuthContext, getAuthContext } from '../../lib/api/auth-fetch';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Separator } from '../../components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import DashboardOverviewView from './views/dashboard-overview-view';
import CampaignsView from './views/campaigns-view';
import AnalyticsView from './views/analytics-view';
import CampaignDetail from '@/modules/campaigns/detail/campaign-detail';

type DashboardTab = 'dashboard' | 'analytics' | 'campaigns' | 'integrations' | 'reports' | 'profile' | 'campaign-detail';

export default function DashboardShell({
  initialTab = 'dashboard',
  initialCampaignId,
}: {
  initialTab?: DashboardTab;
  initialCampaignId?: string;
}) {
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authContext, setAuthContextState] = useState<AuthContext>({});

  useEffect(() => {
    setAuthContextState(getAuthContext());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = useMemo(() => ({
    name: authContext.companyName || 'Unknown company',
    avatar: '',
    role: authContext.role || 'user',
  }), [authContext.companyName, authContext.role]);

  const avatarFallback = useMemo(() => user.name.slice(0, 2).toUpperCase(), [user.name]);

  // Keep tab state in sync with route/query changes (e.g. /dashboard?tab=campaign-detail).
  useEffect(() => setActiveTab(initialTab), [initialTab])

  const campaignNameFromQuery = searchParams.get('campaignName');
  const campaignIdFromQuery = searchParams.get('campaignId');
  const resolvedCampaignId = useMemo(() => {
    const idFromQuery = campaignIdFromQuery?.trim();
    if (idFromQuery) {
      return idFromQuery;
    }

    const idFromInitial = initialCampaignId?.trim();
    return idFromInitial || undefined;
  }, [campaignIdFromQuery, initialCampaignId]);

  const sidebarLabel = useMemo(() => {
    if (activeTab === 'campaign-detail') {
      return 'Campaigns';
    }
    if (activeTab === 'analytics') {
      return 'Analytics';
    }
    if (activeTab === 'integrations') {
      return 'Google Services';
    }
    if (activeTab === 'reports') {
      return 'Reports';
    }
    if (activeTab === 'profile') {
      return 'Profile';
    }
    if (activeTab === 'dashboard') {
      return 'Dashboard';
    }
    return 'Campaigns';
  }, [activeTab]);

  const functionLabel = useMemo(() => {
    if (activeTab !== 'campaign-detail') {
      return null;
    }

    if (campaignNameFromQuery && campaignNameFromQuery.trim().length > 0) {
      return campaignNameFromQuery;
    }

    if (campaignIdFromQuery && campaignIdFromQuery.trim().length > 0) {
      return `Campaign ${campaignIdFromQuery}`;
    }

    return 'Campaign Detail';
  }, [activeTab, campaignIdFromQuery, campaignNameFromQuery]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* SIDEBAR */}
      <aside
        className={clsx(
          "relative flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out z-40",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* LOGO SECTION */}
        <div className={clsx('flex h-16 items-center py-3 transition-all duration-300', collapsed ? 'justify-center px-2' : 'px-4')}>
          <div className={clsx('flex items-center overflow-hidden transition-all duration-300', collapsed ? 'justify-center' : 'gap-3')}>
            <div
              className={clsx(
                'flex aspect-square shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-300',
                collapsed ? 'size-10' : 'size-9'
              )}
            >
              <QrCode className="size-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-bold text-foreground">DynamicQR</span>
                <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">Marketing Suite</span>
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION - FORCE LEFT ALIGNMENT */}
        <div className="flex-1 px-3 py-2">
          <nav className={clsx('transition-all duration-300', collapsed ? 'flex flex-col items-center gap-4' : 'space-y-1')}>
            {[
              { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
              { key: 'integrations', label: 'Google Services', icon: Calendar },
              { key: 'reports', label: 'Reports', icon: BarChart3 },
            ].map((item) => {
              const isActive = activeTab === item.key;
              return (
                <Button
                  key={item.key}
                  onClick={() => setActiveTab(item.key as DashboardTab)}
                  variant="ghost"
                  className={clsx(
                    'relative flex items-center rounded-md transition-all duration-300',
                    collapsed ? 'h-10 w-10 justify-center px-0' : 'h-10 w-full !justify-start gap-3 px-3',
                    isActive
                      ? "bg-secondary text-secondary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={clsx("size-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {isActive && !collapsed && (
                    <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              );
            })}
          </nav>
        </div>

        {/* USER PROFILE - SOURCE-ALIGNED FOOTER */}
        <div className="mt-auto px-3">
          <Separator />
          <div className="pt-3 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={clsx(
                    'h-auto w-full gap-3 rounded-lg px-2 py-2 hover:bg-accent data-[state=open]:bg-accent',
                    collapsed ? 'justify-center px-0' : '!justify-start text-left'
                  )}
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs text-primary">{avatarFallback}</AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="grid flex-1 overflow-hidden text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  )}
                  {!collapsed && <ChevronUp className="ml-auto size-4 text-muted-foreground" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg shadow-lg"
                side={collapsed ? 'right' : 'top'}
                align={collapsed ? 'start' : 'end'}
                sideOffset={collapsed ? 10 : 4}
              >
                <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                  <User className="mr-2 size-4 text-muted-foreground" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4 text-muted-foreground" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 size-4 text-muted-foreground" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* TOP HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((prev) => !prev)}
              className="h-8 w-8 hover:bg-accent"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{sidebarLabel}</BreadcrumbPage>
                </BreadcrumbItem>
                {functionLabel && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{functionLabel}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent"
              aria-label={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {(activeTab === 'integrations' || activeTab === 'profile') && (
              <header>
                <h2 className="text-3xl font-bold tracking-tight capitalize">{activeTab}</h2>
                <p className="text-muted-foreground">Manage your dynamic QR strategy and monitor performance.</p>
              </header>
            )}

            {/* TAB VIEWS */}
            <div className="min-h-[400px]">
              {activeTab === 'dashboard' && <DashboardOverviewView />}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'campaigns' && <CampaignsView />}
              {activeTab === 'campaign-detail' && resolvedCampaignId && <CampaignDetail campaignId={resolvedCampaignId} />}
              {activeTab === 'campaign-detail' && !resolvedCampaignId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign not selected</CardTitle>
                    <CardDescription>Open a campaign from the campaigns list to view details.</CardDescription>
                  </CardHeader>
                </Card>
              )}
              {activeTab === 'integrations' && <IntegrationsDashboard />}
              {activeTab === 'reports' && null}
              {activeTab === 'profile' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Management</CardTitle>
                    <CardDescription>Update your company info and security settings.</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
