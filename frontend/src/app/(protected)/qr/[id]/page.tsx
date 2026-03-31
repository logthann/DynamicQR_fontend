/**
 * QR Detail Page
 *
 * Protected route: /qr/[id]
 */

import QRDetail from '@/modules/qr/detail/qr-detail';

interface QRDetailPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default function QRDetailPage({ params }: QRDetailPageProps) {
  return <QRDetail qrId={params.id} />;
}

