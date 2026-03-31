/**
 * Build a stable redirect URL used for QR image generation.
 */

export function buildShortRedirectUrl(shortCode: string): string {
  const normalizedCode = String(shortCode || '').trim();
  const explicitBase = process.env.NEXT_PUBLIC_SHORT_REDIRECT_BASE_URL;

  if (explicitBase && normalizedCode) {
    return `${explicitBase.replace(/\/+$/, '')}/${normalizedCode}`;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (apiBase && /^https?:\/\//i.test(apiBase) && normalizedCode) {
    const withoutApiPrefix = apiBase.replace(/\/api\/v1\/?$/i, '');
    return `${withoutApiPrefix.replace(/\/+$/, '')}/q/${normalizedCode}`;
  }

  if (typeof window !== 'undefined' && normalizedCode) {
    return `${window.location.origin}/q/${normalizedCode}`;
  }

  return normalizedCode ? `/q/${normalizedCode}` : '/q';
}

