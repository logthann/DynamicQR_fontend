/**
 * Analytics API Module
 *
 * Endpoints:
 * - GET /api/v1/analytics/{qr_id}
 * - GET /api/v1/analytics/campaign/{campaign_id}/summary
 * - GET /api/v1/analytics/campaign/{campaign_id}/internal-scans
 * - GET /api/v1/analytics/campaign/{campaign_id}/ga4-realtime
 * - GET /api/v1/analytics/campaign/{campaign_id}/logs
 * - GET /api/v1/analytics/campaign/{campaign_id}/ga4-insights
 * - GET /api/v1/analytics/campaign/{campaign_id}/comparison
 */

import { getAPIClient } from './base-client';
import * as Types from './generated/types';

export async function getAnalytics(req: Types.GetAnalyticsRequest): Promise<Types.GetAnalyticsResponse> {
  const response = await getAPIClient().get(`/analytics/${req.qrId}`, {
    params: {
      start_date: req.startDate,
      end_date: req.endDate,
    },
  });
  return response.data;
}

// Types for campaign analytics
export interface CampaignKPIData {
  campaign_id: number;
  total_scans: number;
  active_users_ga4: number;
  conversion_rate: number;
  avg_session_duration: number;
}

export interface HourlyScanData {
  hour: string;
  mobile: number;
  desktop: number;
  tablet: number;
  scans: number;
}

export interface HourlyScanResponse {
  campaign_id: number;
  data: HourlyScanData[];
}

export interface GA4RealtimeData {
  time_label: string;
  active_users: number;
}

export interface GA4RealtimeResponse {
  campaign_id: number;
  data: GA4RealtimeData[];
}

export interface GA4InsightEntry {
  page_path: string;
  session_source: string;
  device_category: string;
  engagement_time: number;
}

export interface GA4InsightsResponse {
  campaign_id: number;
  insights: GA4InsightEntry[];
}

export interface ComparisonVersion {
  version: string;
  title: string;
  active_period: {
    start: string;
    end: string | null;
  };
  destination_url: string;
  total_scans: number;
  scan_diff: number | null;
  status: string;
}

export interface ComparisonQRCode {
  id: string;
  name: string;
  campaign: string;
  destination_url: string;
  total_scans: number;
  unique_scans: number;
  growth: number | null;
  sparkline: number[];
  versions: ComparisonVersion[];
}

export interface CampaignQRComparisonResponse {
  campaign_id: number;
  qr_codes: ComparisonQRCode[];
}

export interface ScanLogEntry {
  id: number;
  timestamp: string;
  ip_address: string;
  device: string;
  location: string;
}

export interface ScanLogsResponse {
  campaign_id: number;
  // Some APIs return `data` or `logs` for the array payload — accept either shape
  data: ScanLogEntry[];
  logs?: ScanLogEntry[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Get KPI summary for a campaign
 * GET /api/v1/analytics/campaign/{campaign_id}/summary
 */
export async function getCampaignKPISummary(campaignId: number): Promise<CampaignKPIData> {
  const response = await getAPIClient().get(`/analytics/campaign/${campaignId}/summary`);
  return response.data;
}

/**
 * Get hourly scan data for a campaign
 * GET /api/v1/analytics/campaign/{campaign_id}/internal-scans
 */
export async function getCampaignHourlyScans(
  campaignId: number,
  startDate: string,
  endDate: string
): Promise<HourlyScanResponse> {
  const response = await getAPIClient().get(`/analytics/campaign/${campaignId}/internal-scans`, {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
  return response.data;
}

/**
 * Get GA4 real-time data for a campaign
 * GET /api/v1/analytics/campaign/{campaign_id}/ga4-realtime
 */
export async function getCampaignGA4Realtime(campaignId: number): Promise<GA4RealtimeResponse> {
  const response = await getAPIClient().get(`/analytics/campaign/${campaignId}/ga4-realtime`);
  return response.data;
}

/**
 * Get GA4 insights table data for a campaign
 * GET /api/v1/analytics/campaign/{campaign_id}/ga4-insights
 */
export async function getCampaignGA4Insights(campaignId: number): Promise<GA4InsightsResponse> {
  const response = await getAPIClient().get(`/analytics/campaign/${campaignId}/ga4-insights`);
  return response.data;
}

/**
 * Get campaign QR comparison analytics
 * GET /api/v1/analytics/campaign/{campaign_id}/comparison
 */
export async function getCampaignQRComparison(
  campaignId: number,
  startDate: string,
  endDate: string
): Promise<CampaignQRComparisonResponse> {
  const response = await getAPIClient().get(`/analytics/campaign/${campaignId}/comparison`, {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
  return response.data;
}

/**
 * Get detailed scan logs for a campaign
 * GET /api/v1/analytics/campaign/{campaign_id}/logs
 */
export async function getCampaignScanLogs(
  campaignId: number,
  page: number = 1,
  limit: number = 50,
  startDate?: string,
  endDate?: string
): Promise<ScanLogsResponse> {
  const response = await getAPIClient().get(`/analytics/campaign/${campaignId}/logs`, {
    params: {
      page,
      limit,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    },
  });
  return response.data;
}
