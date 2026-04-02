/**
 * Legacy integrations route compatibility page.
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Integrations | Dynamic QR',
  description: 'Browse and sync Google Calendar integrations',
};

export default function IntegrationsPage() {
  redirect('/dashboard?tab=integrations');
}

