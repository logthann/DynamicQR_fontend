/**
 * QR List Component
 *
 * Endpoint: GET /api/v1/qr
 */

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { QRCode } from '@/lib/api/generated/types';

export default function QRList() {
  const qrQuery = useQuery({
    queryKey: queryKeys.qr.list(),
    queryFn: () => apiClient.getQRs(),
    staleTime: staleTimes.campaigns,
  });

  const qrCodes = qrQuery.data?.qrCodes || [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">QR Codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage your QR lifecycle
          </p>
        </div>
        <Link
          href="/qr/create"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create QR
        </Link>
      </div>

      {qrQuery.isLoading && (
        <div className="rounded-lg border border-muted bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading QR codes...</p>
        </div>
      )}

      {qrQuery.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Failed to load QR list.</p>
        </div>
      )}

      {!qrQuery.isLoading && !qrQuery.isError && qrCodes.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No QR codes found.</p>
          <Link
            href="/qr/create"
            className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Create first QR
          </Link>
        </div>
      )}

      {!qrQuery.isLoading && !qrQuery.isError && qrCodes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <QRCard key={qr.id} qr={qr} />
          ))}
        </div>
      )}
    </section>
  );
}

function QRCard({ qr }: { qr: QRCode }) {
  return (
    <Link
      href={`/qr/${qr.id}`}
      className="group rounded-lg border border-muted bg-card p-4 transition-all hover:border-primary hover:shadow-md"
    >
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground group-hover:text-primary">
          /q/{qr.shortCode}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{qr.destination_url}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {new Date(qr.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
            {(qr.status || 'active').replace('_', ' ')}
          </span>
        </div>
      </div>
    </Link>
  );
}

