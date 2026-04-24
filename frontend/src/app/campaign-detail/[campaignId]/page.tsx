import { redirect } from 'next/navigation';

interface CampaignDetailRouteProps {
  params: {
    campaignId: string;
  };
}

export const dynamic = 'force-dynamic';

export default function CampaignDetailRoute({ params }: CampaignDetailRouteProps) {
  redirect(`/dashboard?tab=campaign-detail&campaignId=${params.campaignId}`);
}

