/**
 * Create QR Page
 *
 * Protected route: /qr/create
 */

import CreateQRForm from './create-qr-form';

export const metadata = {
  title: 'Create QR Code | Dynamic QR',
  description: 'Create a new QR code',
};

export default function CreateQRPage() {
  return <CreateQRForm />;
}

