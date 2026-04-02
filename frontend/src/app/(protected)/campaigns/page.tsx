/**
 * Legacy campaigns route compatibility page.
 *
 * Keeps old route working by forwarding to dashboard campaigns tab.
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Campaigns | Dynamic QR',
  description: 'Manage your QR campaigns',
};

export default function CampaignsPage() {
  redirect('/dashboard?tab=campaigns');
}

