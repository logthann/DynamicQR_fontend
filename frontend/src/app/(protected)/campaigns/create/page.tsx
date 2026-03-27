/**
 * Create Campaign Page
 *
 * Protected route: /campaigns/create
 */

import CreateCampaignForm from './create-campaign-form';

export const metadata = {
  title: 'Create Campaign | Dynamic QR',
  description: 'Create a new QR campaign',
};

export default function CreateCampaignPage() {
  return <CreateCampaignForm />;
}

