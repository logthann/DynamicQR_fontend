/**
 * Next.js Middleware - Protected Route Gating
 *
 * Enforces authentication for protected route groups.
 * - Redirects unauthenticated users to login
 * - Passes through public routes
 * - Validates auth token presence
 */

import { NextRequest, NextResponse } from 'next/server';

function isTokenLikelyValid(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  // JWT format: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    // If exp exists, consider token invalid once expired.
    if (typeof payload.exp === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp > nowInSeconds;
    }

    // No exp claim: treat as present/valid and let backend be source of truth.
    return true;
  } catch {
    return false;
  }
}

/**
 * Protected route groups
 */
const PROTECTED_ROUTES = [
  '/campaigns',
  '/qr',
  '/analytics',
  '/integrations',
  '/dashboard',
];

/**
 * Public routes (no auth required)
 */
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
];

/**
 * Middleware function
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Check if user has auth token
  const authToken = request.cookies.get('auth_token')?.value;
  const hasValidAuth = isTokenLikelyValid(authToken);


  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protect authenticated routes
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!hasValidAuth) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);

      // Remove stale token so login page is reachable on next request.
      if (authToken) {
        response.cookies.set('auth_token', '', { path: '/', maxAge: 0 });
      }

      return response;
    }

    // Token exists - verify it's not expired (basic check)
    // In production, you might want to validate the JWT signature here
    // For now, we trust the HttpOnly cookie from the server
  }

  return NextResponse.next();
}

/**
 * Configure which routes use this middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

