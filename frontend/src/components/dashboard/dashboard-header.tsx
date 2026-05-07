'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  "/dashboard": "breadcrumb.dashboard",
  "/campaigns": "breadcrumb.campaigns",
  "/campaigns/create": "breadcrumb.create",
  "/qrcodes": "breadcrumb.qrcodes",
  "/qrcodes/create": "breadcrumb.create",
  "/google-services": "breadcrumb.googleServices",
  "/google-services/setup": "breadcrumb.setup",
  "/google-services/sync": "breadcrumb.sync",
  "/google-services/import": "breadcrumb.import",
  "/google-services/undo": "breadcrumb.undo",
  "/reports": "breadcrumb.reports",
  "/reports/export": "breadcrumb.export",
  "/settings": "breadcrumb.settings",
  "/accounts": "breadcrumb.accounts",
  "/accounts/employees": "breadcrumb.employees",
};

export function DashboardHeader() {
  const pathname = usePathname();

  const getBreadcrumbLabel = () => {
    // Check for exact matches first
    if (routeLabels[pathname]) {
      return routeLabels[pathname];
    }

    // Check for parent routes
    for (const [route, label] of Object.entries(routeLabels)) {
      if (pathname.startsWith(route + '/')) {
        return label;
      }
    }

    return 'Dashboard';
  };

  const currentLabel = getBreadcrumbLabel();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
