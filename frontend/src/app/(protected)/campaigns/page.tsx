/**
 * Campaigns Page
 *
 * Protected route: /campaigns
 * Displays campaign list
 */

import CampaignList from '@/modules/campaigns/list/campaign-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Campaigns | Dynamic QR',
  description: 'Manage your QR campaigns',
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <CampaignList />
    </div>
  );
}

