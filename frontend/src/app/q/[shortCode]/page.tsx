import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

type ResolveResult =
  | { type: 'redirect'; location: string }
  | { type: 'error'; status: number | null };

function getBackendOrigin(): string {
  const explicitShortBase = process.env.NEXT_PUBLIC_SHORT_REDIRECT_BASE_URL;
  if (explicitShortBase && /^https?:\/\//i.test(explicitShortBase)) {
    return explicitShortBase
      .replace(/\/q\/?$/i, '')
      .replace(/\/+$/, '');
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return apiBase
      .replace(/\/api\/v1\/?$/i, '')
      .replace(/\/+$/, '');
  }

  return 'http://127.0.0.1:8000';
}

async function resolveShortCode(shortCode: string): Promise<ResolveResult> {
  const incomingHeaders = headers();
  const forwardHeaders: Record<string, string> = {};

  const userAgent = incomingHeaders.get('user-agent');
  const forwardedFor = incomingHeaders.get('x-forwarded-for');
  const realIp = incomingHeaders.get('x-real-ip');
  const acceptLanguage = incomingHeaders.get('accept-language');

  if (userAgent) forwardHeaders['user-agent'] = userAgent;
  if (forwardedFor) forwardHeaders['x-forwarded-for'] = forwardedFor;
  if (realIp) forwardHeaders['x-real-ip'] = realIp;
  if (acceptLanguage) forwardHeaders['accept-language'] = acceptLanguage;

  const targetUrl = `${getBackendOrigin()}/q/${encodeURIComponent(shortCode)}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: forwardHeaders,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location) {
        return { type: 'redirect', location };
      }
    }

    if (response.status === 404 || response.status === 410) {
      return { type: 'error', status: response.status };
    }

    return { type: 'error', status: response.status };
  } catch {
    return { type: 'error', status: null };
  }
}

export default async function PublicShortCodeRedirectPage({
  params,
}: {
  params: { shortCode: string };
}) {
  const shortCode = String(params.shortCode || '').trim();

  if (!shortCode) {
    return (
      <section className="mx-auto mt-20 max-w-xl rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
        <h1 className="text-lg font-semibold text-destructive">QR code not found.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Missing short code in the URL.</p>
      </section>
    );
  }

  const result = await resolveShortCode(shortCode);
  if (result.type === 'redirect') {
    redirect(result.location);
  }

  if (result.status === 404) {
    return (
      <section className="mx-auto mt-20 max-w-xl rounded-lg border border-muted bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">QR code not found.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This short code does not exist or has already been deleted.
        </p>
        <Link
          href="/home"
          className="mt-4 inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Go to Home
        </Link>
      </section>
    );
  }

  if (result.status === 410) {
    return (
      <section className="mx-auto mt-20 max-w-xl rounded-lg border border-muted bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">QR code inactive or expired.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This QR code is no longer active, so redirection is unavailable.
        </p>
        <Link
          href="/home"
          className="mt-4 inline-flex items-center rounded-md border border-muted bg-background px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Go to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-20 max-w-xl rounded-lg border border-muted bg-card p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Unable to redirect.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please try again. If the issue continues, check your network or the QR destination.
      </p>
      <Link
        href={`/q/${encodeURIComponent(shortCode)}`}
        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try Again
      </Link>
    </section>
  );
}

