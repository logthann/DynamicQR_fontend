/**
 * OpenAPI Generated API Types
 *
 * This file is auto-generated from specs/frontend-app/contracts/openapi.yaml
 * Re-run openapi-generator-cli to update types
 */

// Auth Endpoints
export interface RegisterRequest {
  email: string;
  password: string;
  company_name: string;
  role: 'user' | 'agency' | 'admin';
}

export interface RegisterResponse {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

// Campaign Endpoints
export interface Campaign {
  id: string;
  name: string;
  status?: 'active' | 'paused' | 'draft' | 'archived';
  description?: string;
  startDate?: string;
  endDate?: string;
  googleEventId?: string;
  calendarSyncStatus?: 'not_linked' | 'synced' | 'out_of_sync' | 'removed';
  calendarLastSyncedAt?: string;
  gaType?: 'OAUTH' | 'MANUAL' | 'NO';
  gaMode?: 'OAUTH' | 'MANUAL' | 'NO';
  gaMeasurementId?: string;
  gaPropertyId?: string;
  gaSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  status: 'active' | 'paused' | 'draft';
  description?: string;
  start_date: string;
  end_date: string;
}

export interface GetCampaignsResponse {
  campaigns: Campaign[];
  total: number;
}

export interface GetCampaignByIdRequest {
  campaignId: string;
}

export interface UpdateCampaignRequest {
  campaignId: string;
  name?: string;
  status?: 'active' | 'paused' | 'draft' | 'archived';
  description?: string;
  start_date?: string;
  end_date?: string;
  ga_type?: 'OAUTH' | 'MANUAL' | 'NO';
  ga_property_id?: string | null;
  ga_measurement_id?: string | null;
  google_event_id?: string | null;
  calendar_sync_status?: 'not_linked' | 'synced' | 'out_of_sync' | 'removed' | null;
  calendar_last_synced_at?: string | null;
  calendar_sync_hash?: string | null;
}

export interface DeleteCampaignRequest {
  campaignId: string;
}

// QR Endpoints
export interface QRCode {
  id: string;
  name: string;
  campaign_id?: number | null;
  campaignId?: string;
  destination_url: string;
  destinationUrl?: string;
  qr_type: 'url' | 'event';
  qrType?: 'url' | 'event';
  design_config?: Record<string, unknown> | null;
  ga_type?: 'OAUTH' | 'MANUAL' | 'NO';
  ga_measurement_id?: string;
  ga_property_id?: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  shortCode: string;
  short_code?: string;
  user_id?: number;
  deleted_at?: string | null;
  status?: 'active' | 'paused' | 'archived';
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface CreateQRRequest {
  owner_user_id?: number;
  name: string;
  campaign_id?: number | null;
  destination_url: string;
  qr_type: 'url' | 'event';
  design_config?: Record<string, unknown> | null;
  ga_type?: 'OAUTH' | 'MANUAL' | 'NO';
  ga_measurement_id?: string;
  ga_property_id?: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  status?: 'active' | 'paused' | 'archived';
}

export interface CreateQRResponse extends QRCode {}

export interface GetQRsResponse {
  qrCodes: QRCode[];
  total: number;
}

export interface GetQRsRequest {
  owner_user_id?: number;
  campaign_id?: number;
  status_filter?: 'active' | 'paused' | 'archived';
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetQRByIdRequest {
  qrId: string;
}

export interface UpdateQRRequest {
  qrId: string;
  name?: string;
  campaign_id?: number | null;
  destination_url?: string;
  qr_type?: 'url' | 'event';
  design_config?: Record<string, unknown> | null;
  ga_type?: 'OAUTH' | 'MANUAL' | 'NO';
  ga_measurement_id?: string;
  ga_property_id?: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  status?: 'active' | 'paused' | 'archived';
}

export interface DeleteQRRequest {
  qrId: string;
}

export interface UpdateQRStatusRequest {
  qrId: string;
  status: 'active' | 'paused' | 'archived';
}

// Analytics Endpoints
export interface Analytics {
  qrId: string;
  views: number;
  uniqueVisitors: number;
  lastUpdated: string;
}

export interface GetAnalyticsRequest {
  qrId: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAnalyticsResponse extends Analytics {}

// Google Calendar Integration
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  googleEventId?: string;
  eventStatus?: string;
  linkedCampaignId?: number | null;
  calendarSyncStatus?: 'not_linked' | 'synced' | 'out_of_sync' | 'removed';
  lastSyncedAt?: string | null;
}

export interface GetCalendarEventsRequest {
  rangeType: 'month' | 'year';
  year: number;
  month?: number;
}

export interface GetCalendarEventsResponse {
  rangeType?: 'month' | 'year';
  year?: number;
  month?: number;
  total?: number;
  events: CalendarEvent[];
}

export interface ImportCampaignsRequest {
  selectedEventIds?: string[];
  rangeType?: 'month' | 'year';
  year?: number;
  month?: number;
  eventIds?: string[];
}

export interface ImportCampaignsResponse {
  created: number;
  updated: number;
  skipped: number;
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  campaigns?: Campaign[];
}

export type IntegrationProvider = 'google_calendar' | 'google_analytics';

export interface IntegrationStatus {
  provider: IntegrationProvider;
  connected: boolean;
  updatedAt?: string;
  accountEmail?: string;
  grantedScopes?: string[];
}

export interface GetIntegrationsResponse {
  integrations: IntegrationStatus[];
}

export interface StartIntegrationConnectRequest {
  provider: IntegrationProvider;
  redirectUri?: string;
}

export interface StartIntegrationConnectResponse {
  authorizationUrl: string;
  state: string;
}

export interface IntegrationCallbackRequest {
  provider: IntegrationProvider;
  code: string;
  state: string;
  redirectUri?: string;
}

export interface IntegrationCallbackResponse {
  status: 'success' | 'error';
  message?: string;
}

export interface RefreshIntegrationRequest {
  providerName: IntegrationProvider;
}

export interface RefreshIntegrationResponse {
  status: 'success' | 'error';
  message?: string;
}

export interface DisconnectIntegrationRequest {
  providerName: IntegrationProvider;
}

export interface SyncCampaignRequest {
  campaignId: string;
}

export interface SyncCampaignResponse {
  status: 'idle' | 'pending' | 'success' | 'recoverable_error' | 'permission_blocked';
  message?: string;
  campaign?: Campaign;
}

export interface UnlinkCampaignRequest {
  campaignId: string;
}

export interface UnlinkCampaignResponse {
  status: 'success' | 'error';
  message?: string;
  campaign?: Campaign;
}

// GA4 Integration Endpoints
export interface GA4Property {
  property_id: string;
  display_name: string;
  ga_measurement_id?: string;
}

export interface GetGA4PropertiesResponse {
  properties: GA4Property[];
}

export interface DetectGA4MeasurementRequest {
  url: string;
}

export interface DetectGA4MeasurementResponse {
  url: string;
  ga_measurement_id?: string;
  measurement_ids?: string[];
  confidence?: string;
  source?: string;
}

// Error Response
export interface ErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// API Client Interface
export interface APIClient {
  // Auth
  register(req: RegisterRequest): Promise<RegisterResponse>;
  login(req: LoginRequest): Promise<LoginResponse>;

  // Campaigns
  getCampaigns(): Promise<GetCampaignsResponse>;
  createCampaign(req: CreateCampaignRequest): Promise<Campaign>;
  getCampaignById(req: GetCampaignByIdRequest): Promise<Campaign>;
  updateCampaign(req: UpdateCampaignRequest): Promise<Campaign>;
  deleteCampaign(req: DeleteCampaignRequest): Promise<void>;

  // QR
  createQR(req: CreateQRRequest): Promise<CreateQRResponse>;
  getQRs(req?: GetQRsRequest): Promise<GetQRsResponse>;
  getQRById(req: GetQRByIdRequest): Promise<QRCode>;
  updateQR(req: UpdateQRRequest): Promise<QRCode>;
  deleteQR(req: DeleteQRRequest): Promise<void>;
  updateQRStatus(req: UpdateQRStatusRequest): Promise<QRCode>;

  // Analytics
  getAnalytics(req: GetAnalyticsRequest): Promise<GetAnalyticsResponse>;

  // Calendar
  getIntegrations(): Promise<GetIntegrationsResponse>;
  startIntegrationConnect(
    req: StartIntegrationConnectRequest
  ): Promise<StartIntegrationConnectResponse>;
  handleIntegrationCallback(
    req: IntegrationCallbackRequest
  ): Promise<IntegrationCallbackResponse>;
  refreshIntegrationToken(req: RefreshIntegrationRequest): Promise<RefreshIntegrationResponse>;
  disconnectIntegration(req: DisconnectIntegrationRequest): Promise<void>;
  getCalendarEvents(req: GetCalendarEventsRequest): Promise<GetCalendarEventsResponse>;
  importCampaigns(req: ImportCampaignsRequest): Promise<ImportCampaignsResponse>;
  syncCampaign(req: SyncCampaignRequest): Promise<SyncCampaignResponse>;
  unlinkCampaign(req: UnlinkCampaignRequest): Promise<UnlinkCampaignResponse>;

  // GA4
  getGA4Properties(): Promise<GetGA4PropertiesResponse>;
  detectGA4Measurement(
    req: DetectGA4MeasurementRequest
  ): Promise<DetectGA4MeasurementResponse>;
}
