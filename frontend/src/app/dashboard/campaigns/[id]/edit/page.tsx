interface PageProps {
  params: Promise<{ id: string }>
}

import CampaignEdit from "../../../../../modules/campaigns/edit/campaign-edit"

export default async function CampaignEditRoute({ params }: PageProps) {
  const { id } = await params
  return <CampaignEdit campaignId={id} />
}
