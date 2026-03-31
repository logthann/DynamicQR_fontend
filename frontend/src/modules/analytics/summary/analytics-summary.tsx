/**
 * Analytics summary view (AC-007)
 * GET /api/v1/analytics/{qr_id} with filter-aware cache keys.
 */

'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';

interface AnalyticsFilters {
  qrId: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FILTERS: AnalyticsFilters = {
  qrId: '',
  startDate: '',
  endDate: '',
};

export default function AnalyticsSummary() {
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);

  const hasQuery = appliedFilters.qrId.trim().length > 0;

  const queryKey = useMemo(
    () =>
      queryKeys.analytics.summary(
        appliedFilters.qrId,
        appliedFilters.startDate || undefined,
        appliedFilters.endDate || undefined
      ),
    [appliedFilters]
  );

  const analyticsQuery = useQuery({
    queryKey,
    queryFn: () =>
      apiClient.getAnalytics({
        qrId: appliedFilters.qrId,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
      }),
    staleTime: staleTimes.analytics,
    enabled: hasQuery,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(draftFilters);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Query QR analytics with filter-aware cache keys.
        </p>
      </div>

      <div className="rounded-lg border border-muted bg-card p-6">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
          <label className="text-sm text-foreground">
            QR ID
            <input
              data-testid="analytics-qr-id"
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              value={draftFilters.qrId}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, qrId: e.target.value }))}
              placeholder="qr_123"
              required
            />
          </label>

          <label className="text-sm text-foreground">
            Start Date
            <input
              data-testid="analytics-start-date"
              type="date"
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              value={draftFilters.startDate}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </label>

          <label className="text-sm text-foreground">
            End Date
            <input
              data-testid="analytics-end-date"
              type="date"
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
              value={draftFilters.endDate}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>

          <button
            data-testid="analytics-apply"
            type="submit"
            className="md:col-span-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {!hasQuery && (
        <div className="rounded-lg border border-dashed border-muted bg-card p-6 text-sm text-muted-foreground">
          Enter a QR ID to load analytics.
        </div>
      )}

      {analyticsQuery.isLoading && (
        <div className="rounded-lg border border-muted bg-card p-6 text-sm text-muted-foreground">
          Loading analytics...
        </div>
      )}

      {analyticsQuery.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Failed to load analytics.
        </div>
      )}

      {analyticsQuery.data && (
        <div className="rounded-lg border border-muted bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Summary</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground">QR ID:</span> {analyticsQuery.data.qrId}
            </p>
            <p>
              <span className="text-foreground">Views:</span> {analyticsQuery.data.views}
            </p>
            <p>
              <span className="text-foreground">Unique Visitors:</span>{' '}
              {analyticsQuery.data.uniqueVisitors}
            </p>
            <p>
              <span className="text-foreground">Last Updated:</span>{' '}
              {new Date(analyticsQuery.data.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

