/**
 * Create QR Code Page
 *
 * Protected route: /qr/create
 * Form to create a new QR code
 */

import { Suspense } from 'react';
import CreateQRCodePage from '@/modules/qr/create/qr-create';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create QR Code | Dynamic QR',
  description: 'Create a new dynamic QR code',
};

export default function CreateQRPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <CreateQRCodePage />
    </Suspense>
  );
}
