import DashboardShell from '@/modules/dashboard/dashboard-shell';

interface DashboardPageProps {
  searchParams?: {
    tab?: string;
    campaignId?: string;
  };
}

export const dynamic = 'force-dynamic';

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const requestedTab = searchParams?.tab;
  const campaignId = searchParams?.campaignId;
  const initialTab =
    requestedTab === 'dashboard' ||
    requestedTab === 'analytics' ||
    requestedTab === 'integrations' ||
    requestedTab === 'profile' ||
    requestedTab === 'campaigns' ||
    requestedTab === 'campaign-detail' ||
    requestedTab === 'reports'
      ? requestedTab
      : 'campaigns';

  return <DashboardShell initialTab={initialTab} initialCampaignId={campaignId} />;
}
