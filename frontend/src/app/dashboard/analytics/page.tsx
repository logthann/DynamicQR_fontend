/**
 * Analytics Page
 *
 * Protected route: /analytics
 * View QR analytics summaries
 */

import CampaignAnalyticsPage from '@/modules/analytics/analytics';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics | Dynamic QR',
  description: 'View QR analytics summaries',
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <CampaignAnalyticsPage />
    </div>
  );
}
