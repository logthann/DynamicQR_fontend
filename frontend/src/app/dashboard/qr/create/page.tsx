/**
 * Create QR Code Page
 *
 * Protected route: /qr/create
 * Form to create a new QR code
 */

import CreateQRCodePage from '@/modules/qr/create/qr-create';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create QR Code | Dynamic QR',
  description: 'Create a new dynamic QR code',
};

export default function CreateQRPage() {
  return <CreateQRCodePage />;
}
