/**
 * API Module Index
 *
 * Centralized exports for all API modules.
 */

// Base client and types
export { getAPIClient, createAPIClient, API_BASE_URL } from './base-client';
export type { APIError } from './base-client';
export type { DashboardOverviewRequest, DashboardOverviewResponse } from './dashboard-api';

// Auth
export * as authApi from './auth-api';
export { register, login } from './auth-api';

// Campaigns
export * as campaignsApi from './campaigns-api';
export { getCampaigns, createCampaign, getCampaignById, updateCampaign, deleteCampaign, normalizeCampaign, looksLikeCampaign } from './campaigns-api';

// QR
export * as qrApi from './qr-api';
export { createQR, getQRs, getQRById, updateQR, deleteQR, updateQRStatus, normalizeQRCode } from './qr-api';

// Analytics
export * as analyticsApi from './analytics-api';
export {
  getAnalytics,
  getCampaignKPISummary,
  getCampaignHourlyScans,
  getCampaignGA4Realtime,
  getCampaignScanLogs,
} from './analytics-api';
export type {
  CampaignKPIData,
  HourlyScanData,
  HourlyScanResponse,
  GA4RealtimeData,
  GA4RealtimeResponse,
  ScanLogEntry,
  ScanLogsResponse,
} from './analytics-api';

// Dashboard
export * as dashboardApi from './dashboard-api';
export { getDashboardOverview } from './dashboard-api';

// Integrations
export * as integrationsApi from './integrations-api';
export { getIntegrations, sessionSyncIntegrations, startIntegrationConnect, handleIntegrationCallback, refreshIntegrationToken, disconnectIntegration } from './integrations-api';

// Calendar
export * as calendarApi from './calendar-api';
export { getCalendarEvents, importCampaigns, syncCampaign, unlinkCampaign, normalizeCalendarEvent } from './calendar-api';

// GA4
export * as ga4Api from './ga4-api';
export { getGA4Properties, detectGA4Measurement, normalizeGA4Property } from './ga4-api';

// Users
export * as usersApi from './users-api';
export { getUsers, getUserById, updateUser, deleteUser } from './users-api';

// Re-export types from generated
export * as Types from './generated/types';
