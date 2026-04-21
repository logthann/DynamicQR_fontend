/**
 * Google OAuth callback page
 *
 * Google redirects here with GET query params (code/state).
 * This page then calls backend callback API via POST body to match backend contract.
 */

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';
import { getAuthToken } from '@/lib/api/auth-fetch';
import { queryClient, queryKeys } from '@/lib/cache/query-client';

const OAUTH_RETURN_PATH_KEY = 'dqr:oauth-return-path';

function GoogleIntegrationCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Processing Google callback...');
  const [isErrorState, setIsErrorState] = useState(false);

  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';
  const oauthError = searchParams.get('error') || '';

  const redirectUri = useMemo(() => getGoogleOAuthRedirectUri(), []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (oauthError) {
        if (isMounted) {
          setMessage(`Google consent failed: ${oauthError}`);
          setIsErrorState(true);
        }
        return;
      }

      if (!code || !state) {
        if (isMounted) {
          setMessage('Missing OAuth code/state in callback URL.');
          setIsErrorState(true);
        }
        return;
      }

      try {
        const token = getAuthToken();
        if (!token) {
          if (isMounted) {
            setMessage('Missing app session token. Please login, then reconnect Google Calendar.');
            setIsErrorState(true);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('[OAUTH] callback redirect_uri:', redirectUri);
        }
        const result = await apiClient.handleIntegrationCallback({
          provider: 'google_calendar',
          code,
          state,
          redirectUri,
        });

        if (!isMounted) {
          return;
        }

        setMessage(result.message || 'Google Calendar connected. Redirecting...');
        setIsErrorState(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });

        const callbackReturnPath =
          typeof window !== 'undefined'
            ? window.sessionStorage.getItem(OAUTH_RETURN_PATH_KEY)
            : null;

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
        }

        const destination = callbackReturnPath || '/dashboard?tab=integrations&google=connected';

        window.setTimeout(() => {
          router.replace(destination);
        }, 600);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }
        setMessage(error?.message || 'Failed to complete OAuth callback exchange.');
        setIsErrorState(true);
        if (process.env.NODE_ENV === 'development') {
          console.error('[OAUTH] callback exchange error:', error);
          console.info(
            '[OAUTH] If this is redirect_uri_mismatch, make sure Google Console redirect URI exactly matches:',
            redirectUri
          );
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [code, oauthError, redirectUri, router, state]);

  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-muted bg-card p-6">
      <h1 className="text-xl font-semibold text-foreground">Google Calendar Callback</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {isErrorState && (
        <div className="mt-4 space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p>
            If you see <code>redirect_uri_mismatch</code>, ensure the exact same callback URL is configured in
            Google Cloud Console.
          </p>
          <p className="break-all font-mono text-xs">Expected redirect URI: {redirectUri || 'N/A'}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.replace('/dashboard?tab=integrations')}
              className="rounded-md border border-muted bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
            >
              Back to Dashboard Integrations
            </button>
            <button
              type="button"
              onClick={() => router.replace('/dashboard?tab=campaigns')}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20"
            >
              Back to Dashboard Campaigns
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function GoogleIntegrationCallbackPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-2xl rounded-lg border border-muted bg-card p-6">
          <h1 className="text-xl font-semibold text-foreground">Google Calendar Callback</h1>
          <p className="mt-2 text-sm text-muted-foreground">Processing Google callback...</p>
        </section>
      }
    >
      <GoogleIntegrationCallbackContent />
    </Suspense>
  );
}

