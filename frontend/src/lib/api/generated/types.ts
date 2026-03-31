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
}

export interface DeleteCampaignRequest {
  campaignId: string;
}

// QR Endpoints
export interface QRCode {
  id: string;
  campaignId: string;
  shortCode: string;
  url: string;
  status?: 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateQRRequest {
  campaignId: string;
  url: string;
}

export interface CreateQRResponse extends QRCode {}

export interface GetQRsResponse {
  qrCodes: QRCode[];
  total: number;
}

export interface GetQRByIdRequest {
  qrId: string;
}

export interface UpdateQRRequest {
  qrId: string;
  campaignId?: string;
  url?: string;
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
}

export interface GetCalendarEventsRequest {
  rangeType: 'month' | 'year';
  year: number;
  month?: number;
}

export interface GetCalendarEventsResponse {
  events: CalendarEvent[];
}

export interface ImportCampaignsRequest {
  selectedEventIds: string[];
}

export interface ImportCampaignsResponse {
  created: number;
  updated: number;
  skipped: number;
}

export type IntegrationProvider = 'google_calendar' | 'google_analytics';

export interface IntegrationStatus {
  provider: IntegrationProvider;
  connected: boolean;
  updatedAt?: string;
}

export interface GetIntegrationsResponse {
  integrations: IntegrationStatus[];
}

export interface StartIntegrationConnectRequest {
  provider: IntegrationProvider;
}

export interface StartIntegrationConnectResponse {
  authorizationUrl: string;
  state: string;
}

export interface IntegrationCallbackRequest {
  provider: IntegrationProvider;
  code: string;
  state: string;
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
}

export interface UnlinkCampaignRequest {
  campaignId: string;
}

export interface UnlinkCampaignResponse {
  status: 'success' | 'error';
  message?: string;
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
  getQRs(): Promise<GetQRsResponse>;
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
}

