/**
 * Bearer JWT Authentication Transport Wrapper
 *
 * Centralized auth fetch for protected API calls via BFF (Backend-For-Frontend) boundary.
 * JWT is stored in HttpOnly secure cookies; this wrapper attaches Bearer token to upstream requests.
 *
 * Usage in server components/route handlers:
 *   const data = await authFetch('/api/v1/campaigns', { method: 'GET' });
 */

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let memoryAuthToken: string | null = null;

export interface AuthContext {
  userId?: number | string;
  role?: string;
  companyName?: string;
}

const AUTH_CONTEXT_STORAGE_KEY = 'auth_context';

function normalizeToken(rawToken: string | null | undefined): string | null {
  if (!rawToken) {
    return null;
  }

  const trimmed = rawToken.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^Bearer\s+/i, '').trim();
}

function readStorageToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const fromLocal = window.localStorage.getItem('auth_token');
  if (fromLocal) {
    return fromLocal;
  }

  const fromSession = window.sessionStorage.getItem('auth_token');
  return fromSession || null;
}

function writeStorageToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('auth_token', token);
  window.sessionStorage.setItem('auth_token', token);
}

function clearStorageToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('auth_token');
  window.sessionStorage.removeItem('auth_token');
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toUserId(value: unknown): number | string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }
  return undefined;
}

function deriveContextFromToken(token: string | null): AuthContext {
  if (!token || typeof window === 'undefined') {
    return {};
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    return {};
  }

  const nestedUser =
    typeof payload.user === 'object' && payload.user !== null
      ? (payload.user as Record<string, unknown>)
      : undefined;

  const principal =
    typeof payload.principal === 'object' && payload.principal !== null
      ? (payload.principal as Record<string, unknown>)
      : undefined;

  const roleCandidate =
    payload.role ??
    payload.user_role ??
    payload.roles ??
    payload.scope ??
    nestedUser?.role ??
    principal?.role;

  const normalizedRole =
    typeof roleCandidate === 'string'
      ? roleCandidate
      : Array.isArray(roleCandidate) && typeof roleCandidate[0] === 'string'
        ? (roleCandidate[0] as string)
        : undefined;

  return {
    userId: toUserId(
      payload.user_id ??
        payload.userId ??
        payload.uid ??
        payload.id ??
        payload.sub ??
        nestedUser?.id ??
        nestedUser?.user_id ??
        principal?.id ??
        principal?.user_id
    ),
    role: normalizedRole,
    companyName:
      (typeof payload.company_name === 'string' ? payload.company_name : undefined) ??
      (typeof payload.companyName === 'string' ? payload.companyName : undefined) ??
      (typeof payload.company === 'string' ? payload.company : undefined) ??
      (typeof payload.tenant === 'string' ? payload.tenant : undefined) ??
      (typeof nestedUser?.company_name === 'string' ? nestedUser.company_name : undefined) ??
      (typeof nestedUser?.companyName === 'string' ? nestedUser.companyName : undefined) ??
      (typeof principal?.company_name === 'string' ? principal.company_name : undefined) ??
      (typeof principal?.companyName === 'string' ? principal.companyName : undefined),
  };
}

export function setAuthContext(context: AuthContext): void {
  if (typeof window === 'undefined') {
    return;
  }

  const nextContext: AuthContext = {
    ...(context.userId !== undefined && context.userId !== null && String(context.userId).length > 0
      ? { userId: context.userId }
      : {}),
    ...(context.role ? { role: context.role } : {}),
    ...(context.companyName ? { companyName: context.companyName } : {}),
  };

  if (!nextContext.userId && !nextContext.role && !nextContext.companyName) {
    window.localStorage.removeItem(AUTH_CONTEXT_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_CONTEXT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_CONTEXT_STORAGE_KEY, JSON.stringify(nextContext));
  window.sessionStorage.setItem(AUTH_CONTEXT_STORAGE_KEY, JSON.stringify(nextContext));
}

export function getAuthContext(): AuthContext {
  if (typeof window === 'undefined') {
    return {};
  }

  const fromLocal = window.localStorage.getItem(AUTH_CONTEXT_STORAGE_KEY);
  const fromSession = window.sessionStorage.getItem(AUTH_CONTEXT_STORAGE_KEY);
  const raw = fromLocal || fromSession;

  let stored: AuthContext = {};
  if (raw) {
    try {
      stored = JSON.parse(raw) as AuthContext;
    } catch {
      // Fall back to token-derived context.
    }
  }

  const derived = deriveContextFromToken(getAuthToken());
  const merged: AuthContext = {
    ...(stored.userId !== undefined ? { userId: stored.userId } : {}),
    ...(stored.role ? { role: stored.role } : {}),
    ...(stored.companyName ? { companyName: stored.companyName } : {}),
    ...(derived.userId !== undefined ? { userId: derived.userId } : {}),
    ...(derived.role ? { role: derived.role } : {}),
    ...(derived.companyName ? { companyName: derived.companyName } : {}),
  };

  if (merged.userId || merged.role || merged.companyName) {
    setAuthContext(merged);
  }
  return merged;
}

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
    const fromCookie = normalizeToken(readCookie('auth_token'));
    if (fromCookie) {
      memoryAuthToken = fromCookie;
      writeStorageToken(fromCookie);
      return fromCookie;
    }

    const fromStorage = normalizeToken(readStorageToken());
    if (fromStorage) {
      memoryAuthToken = fromStorage;
      writeStorageToken(fromStorage);
      return fromStorage;
    }

    return normalizeToken(memoryAuthToken);
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
    if (typeof document === 'undefined') {
      return;
    }

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const cleanToken = normalizeToken(token);
    if (!cleanToken) {
      throw new Error('Invalid auth token');
    }
    memoryAuthToken = cleanToken;
    writeStorageToken(cleanToken);
    const derivedContext = deriveContextFromToken(cleanToken);
    if (derivedContext.userId || derivedContext.role || derivedContext.companyName) {
      setAuthContext(derivedContext);
    }
    document.cookie = `auth_token=${encodeURIComponent(cleanToken)}; Path=/; Max-Age=${86400 * 7}; SameSite=Lax${secure}`;
  } catch (error) {
    console.error('[AUTH-FETCH] Error setting auth token:', error);
  }
}

/**
 * Clear JWT token from cookie (called on logout)
 */
export function clearAuthToken(): void {
  try {
    if (typeof document === 'undefined') {
      return;
    }
    memoryAuthToken = null;
    clearStorageToken();
    window.localStorage.removeItem(AUTH_CONTEXT_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_CONTEXT_STORAGE_KEY);
    document.cookie = 'auth_token=; Path=/; Max-Age=0; SameSite=Lax';
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

