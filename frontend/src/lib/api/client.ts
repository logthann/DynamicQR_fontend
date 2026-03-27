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
import * as Types from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * Normalized error response
 */
export interface APIError {
  message: string;
  code?: string;
  status: number;
  details?: Record<string, any>;
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
    if (process.env.NODE_ENV === 'development') {
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

      // Normalize error
      const apiError: APIError = {
        message: errorData?.message || error.message || 'Unknown error',
        code: errorData?.code,
        status,
        details: errorData?.details,
      };

      console.error(`[API] ✗ ${status} ${error.config?.url}`, apiError);

      // Handle 401 Unauthorized
      if (status === 401) {
        console.warn('[API] 401 Unauthorized - token expired or invalid');
        if (typeof window !== 'undefined') {
          // Client-side redirect only
          window.location.href = '/login?reason=expired';
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

let apiClient: AxiosInstance | null = null;

/**
 * Get or create singleton API client
 */
export function getAPIClient(): AxiosInstance {
  if (!apiClient) {
    apiClient = createAPIClient();
  }
  return apiClient;
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
      return response.data;
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
      return response.data;
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
      const response = await getAPIClient().post('/qr', req);
      return response.data;
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
          startDate: req.startDate,
          endDate: req.endDate,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calendar - Get events
   * GET /api/v1/integrations/google-calendar/events
   */
  async getCalendarEvents(
    req: Types.GetCalendarEventsRequest
  ): Promise<Types.GetCalendarEventsResponse> {
    try {
      const response = await getAPIClient().get('/integrations/google-calendar/events', {
        params: {
          range_type: req.rangeType,
          year: req.year,
          month: req.month,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calendar - Import campaigns
   * POST /api/v1/integrations/google-calendar/import-campaigns
   */
  async importCampaigns(
    req: Types.ImportCampaignsRequest
  ): Promise<Types.ImportCampaignsResponse> {
    try {
      const response = await getAPIClient().post(
        '/integrations/google-calendar/import-campaigns',
        req
      );
      return response.data;
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
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default apiClient;

