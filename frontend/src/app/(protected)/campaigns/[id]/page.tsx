/**
 * Legacy campaign detail route compatibility page.
 *
 * Forwards old path to the new route-first path.
 */

import { redirect } from 'next/navigation';

interface CampaignDetailPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  redirect(`/dashboard?tab=campaign-detail&campaignId=${params.id}`);
}

