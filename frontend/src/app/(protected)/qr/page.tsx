/**
 * QR List Page
 *
 * Protected route: /qr
 */

import QRList from '@/modules/qr/list/qr-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'QR Codes | Dynamic QR',
  description: 'Manage QR lifecycle and status',
};

export default function QRListPage() {
  return <QRList />;
}

