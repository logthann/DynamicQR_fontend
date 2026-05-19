'use client';

import { usePathname } from 'next/navigation';
  import { useLanguage } from '@/contexts/language-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';

const routeLabels: Array<{ route: string; label: string }> = [
  { route: '/dashboard/campaigns/create', label: 'breadcrumb.create' },
  { route: '/dashboard/qr/create', label: 'breadcrumb.create' },
  { route: '/dashboard/integrations/setup', label: 'breadcrumb.setup' },
  { route: '/dashboard/integrations/sync', label: 'breadcrumb.sync' },
  { route: '/dashboard/integrations/import', label: 'breadcrumb.import' },
  { route: '/dashboard/integrations/remove', label: 'breadcrumb.undo' },
  { route: '/dashboard/settings', label: 'breadcrumb.settings' },
  { route: '/dashboard/accounts', label: 'breadcrumb.accounts' },
  { route: '/dashboard/analytics', label: 'breadcrumb.reports' },
  { route: '/dashboard/campaigns', label: 'breadcrumb.campaigns' },
  { route: '/dashboard/qr', label: 'breadcrumb.qrcodes' },
  { route: '/dashboard/integrations', label: 'breadcrumb.googleServices' },
  { route: '/dashboard', label: 'breadcrumb.dashboard' },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const getBreadcrumbKey = () => {
    for (const { route, label } of routeLabels) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        return label;
      }
    }
    return 'breadcrumb.dashboard';
  };

  const currentLabel = t(getBreadcrumbKey());

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
