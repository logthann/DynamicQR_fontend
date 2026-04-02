import CampaignDetail from '@/modules/campaigns/detail/campaign-detail';

interface CampaignDetailRouteProps {
  params: {
    campaignId: string;
  };
}

export const dynamic = 'force-dynamic';

export default function CampaignDetailRoute({ params }: CampaignDetailRouteProps) {
  return <CampaignDetail campaignId={params.campaignId} />;
}

