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
  name?: string;
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
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
}

export interface GetCampaignsResponse {
  campaigns: Campaign[];
  total: number;
}

// QR Endpoints
export interface QRCode {
  id: string;
  campaignId: string;
  shortCode: string;
  url: string;
  createdAt: string;
}

export interface CreateQRRequest {
  campaignId: string;
  url: string;
}

export interface CreateQRResponse extends QRCode {}

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

  // QR
  createQR(req: CreateQRRequest): Promise<CreateQRResponse>;

  // Analytics
  getAnalytics(req: GetAnalyticsRequest): Promise<GetAnalyticsResponse>;

  // Calendar
  getCalendarEvents(req: GetCalendarEventsRequest): Promise<GetCalendarEventsResponse>;
  importCampaigns(req: ImportCampaignsRequest): Promise<ImportCampaignsResponse>;
  syncCampaign(req: SyncCampaignRequest): Promise<SyncCampaignResponse>;
  unlinkCampaign(req: UnlinkCampaignRequest): Promise<UnlinkCampaignResponse>;
}

