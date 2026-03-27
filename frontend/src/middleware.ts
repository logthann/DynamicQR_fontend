/**
 * Next.js Middleware - Protected Route Gating
 *
 * Enforces authentication for protected route groups.
 * - Redirects unauthenticated users to login
 * - Passes through public routes
 * - Validates auth token presence
 */

import { NextRequest, NextResponse } from 'next/server';

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
 * Redirect routes that should not be accessed by authenticated users
 */
const REDIRECT_TO_HOME_IF_AUTHENTICATED = ['/login', '/register'];

/**
 * Middleware function
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Check if user has auth token
  const authToken = request.cookies.get('auth_token')?.value;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from login/register
  if (authToken && REDIRECT_TO_HOME_IF_AUTHENTICATED.some((route) => pathname === route)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect authenticated routes
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!authToken) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
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

