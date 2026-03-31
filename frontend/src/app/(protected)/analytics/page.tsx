/**
 * Analytics Page
 * Protected route: /analytics
 */

import AnalyticsSummary from '@/modules/analytics/summary/analytics-summary';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics | Dynamic QR',
  description: 'View QR analytics summaries',
};

export default function AnalyticsPage() {
  return <AnalyticsSummary />;
}

