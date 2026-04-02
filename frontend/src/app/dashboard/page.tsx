import DashboardShell from '@/modules/dashboard/dashboard-shell';

interface DashboardPageProps {
  searchParams?: {
    tab?: string;
  };
}

export const dynamic = 'force-dynamic';

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const requestedTab = searchParams?.tab;
  const initialTab =
    requestedTab === 'integrations' || requestedTab === 'profile' || requestedTab === 'campaigns'
      ? requestedTab
      : 'campaigns';

  return <DashboardShell initialTab={initialTab} />;
}

