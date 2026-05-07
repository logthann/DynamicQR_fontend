interface PageProps {
  params: Promise<{ id: string }>
}

import EditQRCodePage from "@/modules/qr/edit/qr-edit"

export default async function QREditRoute({ params }: PageProps) {
  const { id } = await params
  return <EditQRCodePage qrId={id} />
}
