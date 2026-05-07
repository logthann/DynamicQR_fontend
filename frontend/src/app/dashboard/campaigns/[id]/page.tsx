interface PageProps {
  params: Promise<{ id: string }>
}

import CampaignDetail from "../../../../modules/campaigns/detail/campaign-detail"

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params
  return <CampaignDetail campaignId={id} />
}
