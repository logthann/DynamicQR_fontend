/**
 * Create Campaign Page
 *
 * Protected route: /campaigns/create
 * Form to create a new campaign
 */

import CampaignCreate from '../../../../modules/campaigns/create/campaign-create';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create Campaign | Dynamic QR',
  description: 'Create a new QR campaign',
};

export default function CreateCampaignPage() {
  return (
    <div className="space-y-6">
      <CampaignCreate />
    </div>
  );
}
