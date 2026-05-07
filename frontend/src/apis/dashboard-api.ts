/**
 * Dashboard API Module
 *
 * Endpoints: GET /api/v1/dashboard/overview
 */

import { getAPIClient } from './base-client';

export interface DashboardOverviewRequest {
  startDate?: string;
  endDate?: string;
  comparePrevious?: boolean;
  topCampaignsLimit?: number;
  includeInactive?: boolean;
}

export interface DashboardOverviewResponse {
  kpis?: Record<string, unknown>;
  charts?: Record<string, unknown>;
  campaigns?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function getDashboardOverview(req: DashboardOverviewRequest = {}): Promise<DashboardOverviewResponse> {
  const response = await getAPIClient().get('/dashboard/overview', {
    params: {
      ...(req.startDate ? { start_date: req.startDate } : {}),
      ...(req.endDate ? { end_date: req.endDate } : {}),
      ...(typeof req.comparePrevious === 'boolean' ? { compare_previous: req.comparePrevious } : {}),
      ...(typeof req.topCampaignsLimit === 'number' ? { top_campaigns_limit: req.topCampaignsLimit } : {}),
      ...(typeof req.includeInactive === 'boolean' ? { include_inactive: req.includeInactive } : {}),
    },
  });
  return (response.data ?? {}) as DashboardOverviewResponse;
}
