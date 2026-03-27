/**
 * Bearer JWT Authentication Transport Wrapper
 *
 * Centralized auth fetch for protected API calls via BFF (Backend-For-Frontend) boundary.
 * JWT is stored in HttpOnly secure cookies; this wrapper attaches Bearer token to upstream requests.
 *
 * Usage in server components/route handlers:
 *   const data = await authFetch('/api/v1/campaigns', { method: 'GET' });
 */

import { cookies } from 'next/headers';

/**
 * Enhanced fetch options with auth
 */
export interface AuthFetchOptions extends RequestInit {
  // Inherit from RequestInit
}

/**
 * Get JWT token from HttpOnly cookie
 */
export function getAuthToken(): string | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    return token || null;
  } catch (error) {
    console.error('[AUTH-FETCH] Error reading auth token:', error);
    return null;
  }
}

/**
 * Set JWT token in HttpOnly cookie (called after login)
 */
export function setAuthToken(token: string): void {
  try {
    const cookieStore = cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7, // 7 days
      path: '/',
    });
  } catch (error) {
    console.error('[AUTH-FETCH] Error setting auth token:', error);
  }
}

/**
 * Clear JWT token from cookie (called on logout)
 */
export function clearAuthToken(): void {
  try {
    const cookieStore = cookies();
    cookieStore.delete('auth_token');
  } catch (error) {
    console.error('[AUTH-FETCH] Error clearing auth token:', error);
  }
}

/**
 * Authenticated fetch wrapper for protected endpoints
 *
 * - Automatically attaches Bearer token from cookie
 * - Handles 401 responses (token expired)
 * - Normalizes errors
 *
 * @param url - Endpoint URL (relative or absolute)
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Response JSON
 */
export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<any> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('[AUTH-FETCH] No authentication token available. User must login first.');
  }

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const fullURL = url.startsWith('http') ? url : `${baseURL}${url}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch(fullURL, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('[AUTH-FETCH] 401 Unauthorized - token may be expired');
      clearAuthToken();
      throw new Error('Unauthorized: Token expired or invalid. Please login again.');
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      throw new Error('Forbidden: Access denied for this action.');
    }

    // Handle other error status codes
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Request failed with status ${response.status}: ${
          errorData.message || response.statusText
        }`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('[AUTH-FETCH] Error during authenticated fetch:', error);
    throw error;
  }
}

/**
 * Public fetch (no auth required)
 */
export async function publicFetch(url: string, options: AuthFetchOptions = {}): Promise<any> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const fullURL = url.startsWith('http') ? url : `${baseURL}${url}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(fullURL, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Request failed with status ${response.status}: ${
          errorData.message || response.statusText
        }`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('[PUBLIC-FETCH] Error:', error);
    throw error;
  }
}

export default {
  authFetch,
  publicFetch,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
};

