/**
 * QR Codes Page
 *
 * Protected route: /qr
 * Displays list of all QR codes
 */

import QRList from '@/modules/qr/list/qr-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'QR Codes | Dynamic QR',
  description: 'Manage QR lifecycle and status',
};

export default function QRPage() {
  return (
    <div className="space-y-6">
      <QRList />
    </div>
  );
}
