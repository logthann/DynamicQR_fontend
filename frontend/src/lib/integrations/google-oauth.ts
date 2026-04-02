/**
 * Google OAuth redirect URI helper.
 *
 * Priority:
 * 1) NEXT_PUBLIC_GOOGLE_REDIRECT_URI (explicit override)
 * 2) NEXT_PUBLIC_APP_URL + /integrations/google/callback
 * 3) ${window.location.origin}/integrations/google/callback (default)
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

export function getGoogleOAuthRedirectUri(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI?.trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${trimTrailingSlash(appUrl)}/integrations/google/callback`;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${trimTrailingSlash(window.location.origin)}/integrations/google/callback`;
}
