/**
 * Campaign Detail Page
 *
 * Protected route: /campaigns/[id]
 */

import CampaignDetail from '@/modules/campaigns/detail/campaign-detail';

interface CampaignDetailPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  return <CampaignDetail campaignId={params.id} />;
}

