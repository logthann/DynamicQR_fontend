/**
 * API Configuration and Client Instance
 *
 * Typed API client for protected endpoints via BFF boundary.
 *
 * Features:
 * - Bearer JWT via HttpOnly cookies
 * - Request logging and error normalization
 * - 401/403 handling with redirect
 * - Type-safe endpoints matching OpenAPI spec
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import * as Types from './generated/types';
import { getAuthContext, getAuthToken } from './auth-fetch';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const AUTO_REDIRECT_ON_401 = process.env.NEXT_PUBLIC_AUTO_REDIRECT_ON_401 === 'true';

function persistLastAPIError(errorInfo: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const key = 'dqr:last-api-error';
    const previousRaw = window.sessionStorage.getItem(key);
    const previous = previousRaw ? (JSON.parse(previousRaw) as unknown[]) : [];
    const next = [...previous.slice(-9), errorInfo];
    window.sessionStorage.setItem(key, JSON.stringify(next));
    (window as any).__DQR_LAST_API_ERROR__ = errorInfo;
  } catch {
    // Best-effort debug storage only.
  }
}

/**
 * Normalized error response
 */
export interface APIError {
  message: string;
  code?: string;
  status: number;
  details?: Record<string, any>;
}

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

type UnknownRecord = Record<string, unknown>;

function toNumericUserId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeCampaign(raw: unknown): Types.Campaign {
  const item = (raw ?? {}) as UnknownRecord;

  return {
    id: String(item.id ?? item.campaign_id ?? ''),
    name: String(item.name ?? ''),
    status:
      typeof item.status === 'string'
        ? (item.status as Types.Campaign['status'])
        : undefined,
    description: typeof item.description === 'string' ? item.description : undefined,
    startDate:
      typeof item.startDate === 'string'
        ? item.startDate
        : typeof item.start_date === 'string'
          ? item.start_date
          : undefined,
    endDate:
      typeof item.endDate === 'string'
        ? item.endDate
        : typeof item.end_date === 'string'
          ? item.end_date
          : undefined,
    googleEventId:
      typeof item.googleEventId === 'string'
        ? item.googleEventId
        : typeof item.google_event_id === 'string'
          ? item.google_event_id
          : undefined,
    calendarSyncStatus:
      typeof item.calendarSyncStatus === 'string'
        ? (item.calendarSyncStatus as Types.Campaign['calendarSyncStatus'])
        : typeof item.calendar_sync_status === 'string'
          ? (item.calendar_sync_status as Types.Campaign['calendarSyncStatus'])
          : undefined,
    calendarLastSyncedAt:
      typeof item.calendarLastSyncedAt === 'string'
        ? item.calendarLastSyncedAt
        : typeof item.calendar_last_synced_at === 'string'
          ? item.calendar_last_synced_at
          : undefined,
    gaType:
      typeof item.gaType === 'string'
        ? (item.gaType as Types.Campaign['gaType'])
        : typeof item.ga_type === 'string'
          ? (item.ga_type as Types.Campaign['gaType'])
          : typeof item.gaMode === 'string'
            ? (item.gaMode as Types.Campaign['gaType'])
            : typeof item.ga_mode === 'string'
              ? (item.ga_mode as Types.Campaign['gaType'])
              : undefined,
    gaMode:
      typeof item.gaMode === 'string'
        ? (item.gaMode as Types.Campaign['gaMode'])
        : typeof item.gaType === 'string'
          ? (item.gaType as Types.Campaign['gaMode'])
          : typeof item.ga_type === 'string'
            ? (item.ga_type as Types.Campaign['gaMode'])
        : typeof item.ga_mode === 'string'
          ? (item.ga_mode as Types.Campaign['gaMode'])
          : undefined,
    gaMeasurementId:
      typeof item.gaMeasurementId === 'string'
        ? item.gaMeasurementId
        : typeof item.ga_measurement_id === 'string'
          ? item.ga_measurement_id
          : undefined,
    gaPropertyId:
      typeof item.gaPropertyId === 'string'
        ? item.gaPropertyId
        : typeof item.ga_property_id === 'string'
          ? item.ga_property_id
          : undefined,
    gaSource:
      typeof item.gaSource === 'string'
        ? item.gaSource
        : typeof item.ga_source === 'string'
          ? item.ga_source
          : undefined,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? item.updated_at ?? new Date().toISOString()),
  };
}

function looksLikeCampaign(raw: unknown): boolean {
  const item = (raw ?? {}) as UnknownRecord;
  return (
    (typeof item.id === 'number' || typeof item.id === 'string') &&
    typeof item.name === 'string'
  );
}

function normalizeCalendarEvent(raw: unknown): Types.CalendarEvent {
  const item = (raw ?? {}) as UnknownRecord;
  const googleEventId = String(item.google_event_id ?? item.event_id ?? item.id ?? '');
  const startsAt = String(
    item.starts_at ?? item.start_datetime ?? item.startTime ?? item.start_time ?? ''
  );
  const endsAt = String(
    item.ends_at ?? item.end_datetime ?? item.endTime ?? item.end_time ?? startsAt
  );

  return {
    id: googleEventId,
    googleEventId,
    title: String(item.title ?? ''),
    description: typeof item.description === 'string' ? item.description : undefined,
    startTime: startsAt,
    endTime: endsAt,
    eventStatus:
      typeof item.event_status === 'string'
        ? item.event_status
        : typeof item.status === 'string'
          ? item.status
          : undefined,
    linkedCampaignId:
      typeof item.linked_campaign_id === 'number' ? item.linked_campaign_id : null,
    calendarSyncStatus:
      typeof item.calendar_sync_status === 'string'
        ? (item.calendar_sync_status as Types.CalendarEvent['calendarSyncStatus'])
        : undefined,
    lastSyncedAt:
      typeof item.last_synced_at === 'string' ? item.last_synced_at : undefined,
  };
}

function normalizeCalendarEventsResponse(raw: unknown): Types.GetCalendarEventsResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const eventsRaw = Array.isArray(data.events) ? data.events : [];

  return {
    rangeType:
      typeof data.range_type === 'string'
        ? (data.range_type as 'month' | 'year')
        : undefined,
    year: typeof data.year === 'number' ? data.year : undefined,
    month: typeof data.month === 'number' ? data.month : undefined,
    // Keep extra range metadata available for UI code that inspects raw payload.
    ...(typeof data.from_month === 'number' ? { fromMonth: data.from_month } : {}),
    ...(typeof data.to_month === 'number' ? { toMonth: data.to_month } : {}),
    total: typeof data.total === 'number' ? data.total : eventsRaw.length,
    events: eventsRaw.map((event) => normalizeCalendarEvent(event)),
  } as Types.GetCalendarEventsResponse;
}

function normalizeQRCode(raw: unknown): Types.QRCode {
  const item = (raw ?? {}) as UnknownRecord;
  const destinationUrl = String(item.destination_url ?? item.destinationUrl ?? item.url ?? item.target_url ?? '');
  const qrTypeRaw = String(item.qr_type ?? item.qrType ?? 'url');
  const qrType: 'url' | 'event' = qrTypeRaw === 'event' ? 'event' : 'url';
  const campaignIdRaw = item.campaign_id ?? item.campaignId;

  return {
    id: String(item.id ?? item.qr_id ?? ''),
    name: String(item.name ?? ''),
    campaign_id:
      typeof campaignIdRaw === 'number'
        ? campaignIdRaw
        : typeof campaignIdRaw === 'string' && campaignIdRaw.length > 0
          ? Number(campaignIdRaw)
          : null,
    campaignId: String(campaignIdRaw ?? ''),
    destination_url: destinationUrl,
    destinationUrl,
    qr_type: qrType,
    qrType,
    design_config:
      typeof item.design_config === 'object' && item.design_config !== null
        ? (item.design_config as Record<string, unknown>)
        : null,
    ga_measurement_id:
      typeof item.ga_measurement_id === 'string' ? item.ga_measurement_id : undefined,
    utm_source: typeof item.utm_source === 'string' ? item.utm_source : undefined,
    utm_medium: typeof item.utm_medium === 'string' ? item.utm_medium : undefined,
    utm_campaign: typeof item.utm_campaign === 'string' ? item.utm_campaign : undefined,
    shortCode: String(item.shortCode ?? item.short_code ?? ''),
    short_code: typeof item.short_code === 'string' ? item.short_code : undefined,
    user_id: typeof item.user_id === 'number' ? item.user_id : undefined,
    deleted_at: typeof item.deleted_at === 'string' ? item.deleted_at : null,
    status:
      typeof item.status === 'string'
        ? (item.status as Types.QRCode['status'])
        : undefined,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
    created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
    updatedAt:
      typeof item.updatedAt === 'string'
        ? item.updatedAt
        : typeof item.updated_at === 'string'
          ? item.updated_at
          : undefined,
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : undefined,
  };
}

function normalizeQRListResponse(raw: unknown): Types.GetQRsResponse {
  const data = (raw ?? {}) as UnknownRecord;

  if (Array.isArray(raw)) {
    const qrCodes = raw.map((item) => normalizeQRCode(item));
    return { qrCodes, total: qrCodes.length };
  }

  const candidate =
    (Array.isArray(data.qrCodes) && data.qrCodes) ||
    (Array.isArray(data.qr_codes) && data.qr_codes) ||
    (Array.isArray(data.items) && data.items) ||
    ((data.data as UnknownRecord | undefined) &&
    Array.isArray((data.data as UnknownRecord).qrCodes)
      ? ((data.data as UnknownRecord).qrCodes as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) &&
    Array.isArray((data.data as UnknownRecord).qr_codes)
      ? ((data.data as UnknownRecord).qr_codes as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) &&
    Array.isArray((data.data as UnknownRecord).items)
      ? ((data.data as UnknownRecord).items as unknown[])
      : undefined);

  const qrCodes = (candidate ?? []).map((item) => normalizeQRCode(item));
  const rawTotal = data.total;
  const total = typeof rawTotal === 'number' ? rawTotal : qrCodes.length;

  return { qrCodes, total };
}

function normalizeCampaignListResponse(raw: unknown): Types.GetCampaignsResponse {
  const data = (raw ?? {}) as UnknownRecord;

  // Support array response: [{...}, {...}]
  if (Array.isArray(raw)) {
    const campaigns = raw.map((item) => normalizeCampaign(item));
    return { campaigns, total: campaigns.length };
  }

  // Support wrapped shapes commonly used by FastAPI services.
  const candidate =
    (Array.isArray(data.campaigns) && data.campaigns) ||
    (Array.isArray(data.items) && data.items) ||
    ((data.data as UnknownRecord | undefined) &&
    Array.isArray((data.data as UnknownRecord).campaigns)
      ? ((data.data as UnknownRecord).campaigns as unknown[])
      : undefined) ||
    ((data.data as UnknownRecord | undefined) &&
    Array.isArray((data.data as UnknownRecord).items)
      ? ((data.data as UnknownRecord).items as unknown[])
      : undefined);

  const campaigns = (candidate ?? []).map((item) => normalizeCampaign(item));
  const rawTotal = data.total;
  const total = typeof rawTotal === 'number' ? rawTotal : campaigns.length;

  return { campaigns, total };
}

function extractAPIErrorMessage(errorData: any, fallback: string): string {
  if (typeof errorData?.message === 'string' && errorData.message.trim()) {
    return errorData.message;
  }

  const detail = errorData?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === 'string') {
      return first;
    }
    if (first && typeof first.msg === 'string') {
      return first.msg;
    }
  }

  return fallback;
}

/**
 * Create and configure typed API client instance
 */
export function createAPIClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true, // Include HttpOnly cookies for BFF auth
    timeout: 30000, // 30s timeout
  });

  /**
   * Request interceptor - log outgoing requests
   */
  client.interceptors.request.use((config) => {
    const token = getAuthToken();
    const authContext = getAuthContext();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    config.headers = config.headers ?? {};
    const headerBag = config.headers as Record<string, string>;
    if (authContext.userId !== undefined) {
      headerBag['x-user-id'] = String(authContext.userId);
    }
    if (authContext.role) {
      headerBag['x-role'] = authContext.role;
    }
    if (authContext.companyName) {
      headerBag['x-company-name'] = authContext.companyName;
    }

    if (process.env.NODE_ENV === 'development') {
      const hasBearer = Boolean((config.headers as Record<string, string> | undefined)?.Authorization);
      const tokenParts = token ? token.split('.').length : 0;
      console.log(`[API] auth header attached: ${hasBearer ? 'yes' : 'no'}`);
      console.log(`[API] token format: ${token ? (tokenParts === 3 ? 'jwt-like' : 'non-jwt') : 'missing'}`);
      console.log(
        `[API] auth context headers: user=${authContext.userId ?? 'n/a'} role=${authContext.role ?? 'n/a'} company=${authContext.companyName ?? 'n/a'}`
      );
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  });

  /**
   * Response interceptor - error handling and logging
   */
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ✓ ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status || 0;
      const errorData = error.response?.data as any;
      const fallbackMessage = error.message || 'Unknown error';
      const normalizedMessage = extractAPIErrorMessage(errorData, fallbackMessage);

      // Normalize error
      const apiError: APIError = {
        message: normalizedMessage,
        code: errorData?.code,
        status,
        details: errorData?.details,
      };

      console.error(`[API] ✗ ${status} ${error.config?.url}`, apiError);
      persistLastAPIError({
        at: new Date().toISOString(),
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status,
        requestHeaders: error.config?.headers,
        responseData: errorData,
        normalized: apiError,
      });

      // Handle 401 Unauthorized
      if (status === 401) {
        console.warn('[API] 401 Unauthorized - token expired or invalid');
        if (typeof window !== 'undefined' && AUTO_REDIRECT_ON_401) {
          // Client-side redirect only
          window.location.href = '/login?reason=expired';
        } else {
          console.warn(
            '[API_DEBUG] Auto redirect on 401 is disabled. Read sessionStorage key "dqr:last-api-error" for full details.'
          );
        }
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.warn('[API] 403 Forbidden - access denied');
        apiError.message = 'You do not have permission to perform this action.';
      }

      // Handle network errors
      if (!error.response) {
        apiError.message = 'Network error - unable to reach server';
      }

      return Promise.reject(apiError);
    }
  );

  return client;
}

let axiosClient: AxiosInstance | null = null;

/**
 * Get or create singleton API client
 */
export function getAPIClient(): AxiosInstance {
  if (!axiosClient) {
    axiosClient = createAPIClient();
  }
  return axiosClient;
}

/**
 * Type-safe API wrapper for protected calls
 *
 * All endpoints trace to OpenAPI spec and accept/return typed payloads.
 */
export const apiClient = {
  /**
   * Auth - Register
   * POST /api/v1/auth/register
   */
  async register(req: Types.RegisterRequest): Promise<Types.RegisterResponse> {
    try {
      const response = await getAPIClient().post('/auth/register', req);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Auth - Login
   * POST /api/v1/auth/login
   */
  async login(req: Types.LoginRequest): Promise<Types.LoginResponse> {
    try {
      const response = await getAPIClient().post('/auth/login', req);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Campaigns - List
   * GET /api/v1/campaigns
   */
  async getCampaigns(): Promise<Types.GetCampaignsResponse> {
    try {
      const response = await getAPIClient().get('/campaigns');
      return normalizeCampaignListResponse(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Campaigns - Create
   * POST /api/v1/campaigns
   */
  async createCampaign(req: Types.CreateCampaignRequest): Promise<Types.Campaign> {
    try {
      const response = await getAPIClient().post('/campaigns', req);
      return normalizeCampaign(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Campaigns - Detail
   * GET /api/v1/campaigns/{campaign_id}
   */
  async getCampaignById(req: Types.GetCampaignByIdRequest): Promise<Types.Campaign> {
    try {
      const response = await getAPIClient().get(`/campaigns/${req.campaignId}`);
      return normalizeCampaign(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Campaigns - Update
   * PATCH /api/v1/campaigns/{campaign_id}
   */
  async updateCampaign(req: Types.UpdateCampaignRequest): Promise<Types.Campaign> {
    try {
      const { campaignId, ...payload } = req;
      const response = await getAPIClient().patch(`/campaigns/${campaignId}`, payload);
      return normalizeCampaign(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Campaigns - Delete
   * DELETE /api/v1/campaigns/{campaign_id}
   */
  async deleteCampaign(req: Types.DeleteCampaignRequest): Promise<void> {
    try {
      await getAPIClient().delete(`/campaigns/${req.campaignId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * QR - Create
   * POST /api/v1/qr
   */
  async createQR(req: Types.CreateQRRequest): Promise<Types.CreateQRResponse> {
    try {
      const authContext = getAuthContext();
      const contextOwnerUserId = toNumericUserId(authContext.userId);
      const requestOwnerUserId =
        typeof req.owner_user_id === 'number' ? req.owner_user_id : contextOwnerUserId;
      const { owner_user_id: _ignoredOwnerUserId, ...payload } = req;

      const response = await getAPIClient().post('/qr/', payload, {
        params: {
          ...(typeof requestOwnerUserId === 'number' ? { owner_user_id: requestOwnerUserId } : {}),
        },
      });
      return normalizeQRCode(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * QR - List
   * GET /api/v1/qr
   */
  async getQRs(req?: Types.GetQRsRequest): Promise<Types.GetQRsResponse> {
    try {
      const authContext = getAuthContext();
      const contextOwnerUserId = toNumericUserId(authContext.userId);
      const requestOwnerUserId =
        typeof req?.owner_user_id === 'number' ? req.owner_user_id : contextOwnerUserId;

      const response = await getAPIClient().get('/qr/', {
        params: {
          ...(typeof requestOwnerUserId === 'number' ? { owner_user_id: requestOwnerUserId } : {}),
          ...(typeof req?.campaign_id === 'number' ? { campaign_id: req.campaign_id } : {}),
          ...(req?.status_filter ? { status_filter: req.status_filter } : {}),
          ...(typeof req?.include_deleted === 'boolean' ? { include_deleted: req.include_deleted } : {}),
          ...(typeof req?.limit === 'number' ? { limit: req.limit } : {}),
          ...(typeof req?.offset === 'number' ? { offset: req.offset } : {}),
        },
      });
      return normalizeQRListResponse(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * QR - Detail
   * GET /api/v1/qr/{qr_id}
   */
  async getQRById(req: Types.GetQRByIdRequest): Promise<Types.QRCode> {
    try {
      const response = await getAPIClient().get(`/qr/${req.qrId}`);
      return normalizeQRCode(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * QR - Update
   * PATCH /api/v1/qr/{qr_id}
   */
  async updateQR(req: Types.UpdateQRRequest): Promise<Types.QRCode> {
    try {
      const { qrId, ...payload } = req;
      const response = await getAPIClient().patch(`/qr/${qrId}`, payload);
      return normalizeQRCode(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * QR - Delete
   * DELETE /api/v1/qr/{qr_id}
   */
  async deleteQR(req: Types.DeleteQRRequest): Promise<void> {
    try {
      await getAPIClient().delete(`/qr/${req.qrId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * QR - Update status
   * PATCH /api/v1/qr/{qr_id}/status
   */
  async updateQRStatus(req: Types.UpdateQRStatusRequest): Promise<Types.QRCode> {
    try {
      const response = await getAPIClient().patch(`/qr/${req.qrId}/status`, {
        status: req.status,
      });
      return normalizeQRCode(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Analytics - Get summary
   * GET /api/v1/analytics/{qr_id}
   */
  async getAnalytics(req: Types.GetAnalyticsRequest): Promise<Types.GetAnalyticsResponse> {
    try {
      const response = await getAPIClient().get(`/analytics/${req.qrId}`, {
        params: {
          start_date: req.startDate,
          end_date: req.endDate,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Dashboard - Overview
   * GET /api/v1/dashboard/overview
   */
  async getDashboardOverview(
    req: DashboardOverviewRequest = {}
  ): Promise<DashboardOverviewResponse> {
    try {
      const response = await getAPIClient().get('/dashboard/overview', {
        params: {
          ...(req.startDate ? { start_date: req.startDate } : {}),
          ...(req.endDate ? { end_date: req.endDate } : {}),
          ...(typeof req.comparePrevious === 'boolean'
            ? { compare_previous: req.comparePrevious }
            : {}),
          ...(typeof req.topCampaignsLimit === 'number'
            ? { top_campaigns_limit: req.topCampaignsLimit }
            : {}),
          ...(typeof req.includeInactive === 'boolean'
            ? { include_inactive: req.includeInactive }
            : {}),
        },
      });

      return (response.data ?? {}) as DashboardOverviewResponse;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Integrations - List
   * GET /api/v1/integrations
   */
  async getIntegrations(): Promise<Types.GetIntegrationsResponse> {
    try {
      // Prefer canonical path first to avoid slash redirects that may drop auth headers.
      let response;
      try {
        response = await getAPIClient().get('/integrations');
      } catch (firstError: any) {
        const status = firstError?.status;
        if (status === 401) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[API] /integrations returned 401; treating as disconnected providers.');
          }
          return { integrations: [] };
        }
        if (status !== 404 && status !== 405) {
          throw firstError;
        }
        response = await getAPIClient().get('/integrations/');
      }
      const body = response.data as unknown;
      const data = (body ?? {}) as {
        integrations?: Array<Record<string, unknown>>;
        providers?: Array<Record<string, unknown>>;
      };
      const source =
        Array.isArray(data.integrations)
          ? data.integrations
          : Array.isArray(data.providers)
            ? data.providers
            : Array.isArray(body)
              ? (body as Array<Record<string, unknown>>)
              : [];

      return {
        integrations: source.map((item) => ({
          provider: String(item.provider ?? item.provider_name ?? 'google_calendar') as Types.IntegrationProvider,
          connected: Boolean(item.connected),
          updatedAt:
            typeof item.updatedAt === 'string'
              ? item.updatedAt
              : typeof item.updated_at === 'string'
                ? item.updated_at
                : undefined,
          accountEmail:
            typeof item.accountEmail === 'string'
              ? item.accountEmail
              : typeof item.account_email === 'string'
                ? item.account_email
                : typeof item.email === 'string'
                  ? item.email
                  : undefined,
          grantedScopes: (() => {
            const fromArray = Array.isArray(item.grantedScopes)
              ? item.grantedScopes
              : Array.isArray(item.granted_scopes)
                ? item.granted_scopes
                : Array.isArray(item.scopes)
                  ? item.scopes
                  : null;

            if (fromArray) {
              return fromArray.filter((scope): scope is string => typeof scope === 'string');
            }

            const fromString =
              typeof item.grantedScopes === 'string'
                ? item.grantedScopes
                : typeof item.granted_scopes === 'string'
                  ? item.granted_scopes
                  : typeof item.scopes === 'string'
                    ? item.scopes
                    : undefined;

            if (!fromString) {
              return undefined;
            }

            return fromString
              .split(/[\s,]+/)
              .map((scope) => scope.trim())
              .filter(Boolean);
          })(),
        })),
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Integrations - Start OAuth connect
   * POST /api/v1/integrations/connect
   */
  async startIntegrationConnect(
    req: Types.StartIntegrationConnectRequest
  ): Promise<Types.StartIntegrationConnectResponse> {
    try {
      const resolvedRedirectUri = req.redirectUri || getGoogleOAuthRedirectUri();
      const response = await getAPIClient().post('/integrations/connect', {
        provider_name: req.provider,
        ...(resolvedRedirectUri ? { redirect_uri: resolvedRedirectUri } : {}),
      });
      const data = (response.data ?? {}) as Record<string, unknown>;
      return {
        authorizationUrl: String(data.authorization_url ?? data.authorizationUrl ?? ''),
        state: String(data.state ?? ''),
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Integrations - OAuth callback
   * POST /api/v1/integrations/callback
   */
  async handleIntegrationCallback(
    req: Types.IntegrationCallbackRequest
  ): Promise<Types.IntegrationCallbackResponse> {
    try {
      const resolvedRedirectUri = req.redirectUri || getGoogleOAuthRedirectUri();
      const response = await getAPIClient().post('/integrations/callback', {
        provider_name: req.provider,
        code: req.code,
        state: req.state,
        ...(resolvedRedirectUri ? { redirect_uri: resolvedRedirectUri } : {}),
      });
      const data = (response.data ?? {}) as Record<string, unknown>;
      return {
        status:
          data.status === 'error'
            ? 'error'
            : 'success',
        message: typeof data.message === 'string' ? data.message : undefined,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Integrations - Refresh provider token
   * POST /api/v1/integrations/{provider_name}/refresh
   */
  async refreshIntegrationToken(
    req: Types.RefreshIntegrationRequest
  ): Promise<Types.RefreshIntegrationResponse> {
    try {
      const response = await getAPIClient().post(`/integrations/${req.providerName}/refresh`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Integrations - Disconnect provider
   * DELETE /api/v1/integrations/{provider_name}
   */
  async disconnectIntegration(req: Types.DisconnectIntegrationRequest): Promise<void> {
    try {
      await getAPIClient().delete(`/integrations/${req.providerName}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calendar - Get events
   * GET /api/v1/integrations/google-calendar/events
   */
  async getCalendarEvents(
    req: Types.GetCalendarEventsRequest & {
      fromMonth?: number;
      toMonth?: number;
    }
  ): Promise<Types.GetCalendarEventsResponse> {
    try {
      const request = req as Types.GetCalendarEventsRequest & {
        fromMonth?: number;
        toMonth?: number;
      };

      const useMonthRange =
        request.rangeType === 'month' &&
        typeof request.fromMonth === 'number' &&
        typeof request.toMonth === 'number';

      const response = await getAPIClient().get('/integrations/google-calendar/events', {
        params: {
          range_type: request.rangeType,
          year: request.year,
          ...(useMonthRange
            ? {
                from_month: request.fromMonth,
                to_month: request.toMonth,
              }
            : request.rangeType === 'month' && typeof request.month === 'number'
              ? { month: request.month }
              : {}),
        },
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[Calendar Events] raw backend response:', response.data);
      }
      return normalizeCalendarEventsResponse(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calendar - Import campaigns
   * POST /api/v1/integrations/google-calendar/import-campaigns
   */
  async importCampaigns(
    req: Types.ImportCampaignsRequest & {
      fromMonth?: number;
      toMonth?: number;
    }
  ): Promise<Types.ImportCampaignsResponse> {
    try {
      const request = req as Types.ImportCampaignsRequest & {
        fromMonth?: number;
        toMonth?: number;
      };

      const eventIds =
        Array.isArray(request.eventIds) && request.eventIds.length > 0
          ? request.eventIds
          : Array.isArray(request.selectedEventIds)
            ? request.selectedEventIds
            : [];

      const response = await getAPIClient().post(
        '/integrations/google-calendar/import-campaigns',
        {
          range_type: request.rangeType,
          year: request.year,
          ...(request.rangeType === 'month' && typeof request.month === 'number'
            ? { month: request.month }
            : {}),
          ...(request.rangeType === 'month' &&
          typeof request.fromMonth === 'number' &&
          typeof request.toMonth === 'number'
            ? {
                from_month: request.fromMonth,
                to_month: request.toMonth,
              }
            : {}),
          event_ids: eventIds,
        }
      );
      const data = (response.data ?? {}) as Record<string, unknown>;
      const created =
        typeof data.created_count === 'number'
          ? data.created_count
          : typeof data.created === 'number'
            ? data.created
            : 0;
      const updated =
        typeof data.updated_count === 'number'
          ? data.updated_count
          : typeof data.updated === 'number'
            ? data.updated
            : 0;
      const skipped =
        typeof data.skipped_count === 'number'
          ? data.skipped_count
          : typeof data.skipped === 'number'
            ? data.skipped
            : 0;

      const campaignsRaw = Array.isArray(data.campaigns) ? data.campaigns : [];

      return {
        created,
        updated,
        skipped,
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        campaigns: campaignsRaw.map((item) => normalizeCampaign(item)),
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calendar - Sync campaign
   * POST /api/v1/campaigns/{campaign_id}/calendar/sync
   */
  async syncCampaign(req: Types.SyncCampaignRequest): Promise<Types.SyncCampaignResponse> {
    try {
      const response = await getAPIClient().post(
        `/campaigns/${req.campaignId}/calendar/sync`,
        {}
      );
      if (looksLikeCampaign(response.data)) {
        return {
          status: 'success',
          message: 'Campaign synchronized with Google Calendar.',
          campaign: normalizeCampaign(response.data),
        };
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calendar - Unlink campaign
   * DELETE /api/v1/campaigns/{campaign_id}/calendar/link
   */
  async unlinkCampaign(req: Types.UnlinkCampaignRequest): Promise<Types.UnlinkCampaignResponse> {
    try {
      const response = await getAPIClient().delete(
        `/campaigns/${req.campaignId}/calendar/link`
      );
      if (looksLikeCampaign(response.data)) {
        return {
          status: 'success',
          message: 'Campaign unlinked from Google Calendar.',
          campaign: normalizeCampaign(response.data),
        };
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * GA4 - List properties
   * GET /api/v1/ga4/properties
   */
  async getGA4Properties(): Promise<Types.GetGA4PropertiesResponse> {
    try {
      const response = await getAPIClient().get('/ga4/properties');
      return normalizeGA4PropertiesResponse(response.data);
    } catch (error) {
      throw error;
    }
  },

  /**
   * GA4 - Detect measurement id from URL
   * GET /api/v1/ga4/detect?url=...
   */
  async detectGA4Measurement(
    req: Types.DetectGA4MeasurementRequest
  ): Promise<Types.DetectGA4MeasurementResponse> {
    try {
      const response = await getAPIClient().get('/ga4/detect', {
        params: {
          url: req.url,
        },
      });
      return normalizeGA4DetectResponse(req.url, response.data);
    } catch (error) {
      throw error;
    }
  },
};

function normalizeGA4Property(raw: unknown): Types.GA4Property {
  const item = (raw ?? {}) as UnknownRecord;
  const gaMeasurementId =
    typeof item.ga_measurement_id === 'string'
      ? item.ga_measurement_id
      : typeof item.measurement_id === 'string'
        ? item.measurement_id
        : undefined;

  return {
    property_id: String(item.property_id ?? item.propertyId ?? item.id ?? ''),
    display_name: String(item.display_name ?? item.displayName ?? item.name ?? ''),
    ...(gaMeasurementId ? { ga_measurement_id: gaMeasurementId } : {}),
  };
}

function normalizeGA4PropertiesResponse(raw: unknown): Types.GetGA4PropertiesResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const source =
    (Array.isArray(data.properties) && data.properties) ||
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(raw) ? (raw as unknown[]) : []);

  return {
    properties: source.map((item) => normalizeGA4Property(item)),
  };
}

function normalizeGA4DetectResponse(
  requestUrl: string,
  raw: unknown
): Types.DetectGA4MeasurementResponse {
  const data = (raw ?? {}) as UnknownRecord;
  const measurementIds = Array.isArray(data.measurement_ids)
    ? data.measurement_ids.filter((id): id is string => typeof id === 'string')
    : undefined;

  const gaMeasurementId =
    typeof data.ga_measurement_id === 'string'
      ? data.ga_measurement_id
      : typeof data.measurement_id === 'string'
        ? data.measurement_id
        : measurementIds?.[0];

  return {
    url: typeof data.url === 'string' ? data.url : requestUrl,
    ...(gaMeasurementId ? { ga_measurement_id: gaMeasurementId } : {}),
    ...(measurementIds ? { measurement_ids: measurementIds } : {}),
    ...(typeof data.confidence === 'string' ? { confidence: data.confidence } : {}),
    ...(typeof data.source === 'string' ? { source: data.source } : {}),
  };
}

export default apiClient;

