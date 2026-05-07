/**
 * Base API Client Configuration
 *
 * Core axios instance with interceptors for auth and error handling.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { getAuthContext, getAuthToken } from './auth-fetch';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const AUTO_REDIRECT_ON_401 = process.env.NEXT_PUBLIC_AUTO_REDIRECT_ON_401 === 'true';

export interface APIError {
  message: string;
  code?: string;
  status: number;
  details?: Record<string, any>;
}

function persistLastAPIError(errorInfo: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
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
    if (typeof first === 'string') return first;
    if (first && typeof first.msg === 'string') return first.msg;
  }
  return fallback;
}

export function createAPIClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true,
    timeout: 30000,
  });

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
    }
    return config;
  });

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

      if (status === 401) {
        console.warn('[API] 401 Unauthorized - token expired or invalid');
        if (typeof window !== 'undefined' && AUTO_REDIRECT_ON_401) {
          window.location.href = '/login?reason=expired';
        } else {
          console.warn('[API_DEBUG] Auto redirect on 401 is disabled. Read sessionStorage key "dqr:last-api-error" for full details.');
        }
      }

      if (status === 403) {
        console.warn('[API] 403 Forbidden - access denied');
        apiError.message = 'You do not have permission to perform this action.';
      }

      if (!error.response) {
        apiError.message = 'Network error - unable to reach server';
      }

      return Promise.reject(apiError);
    }
  );

  return client;
}

let axiosClient: AxiosInstance | null = null;

export function getAPIClient(): AxiosInstance {
  if (!axiosClient) {
    axiosClient = createAPIClient();
  }
  return axiosClient;
}

export type UnknownRecord = Record<string, unknown>;

export function toNumericUserId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
