/**
 * Integration connect/callback panel
 *
 * Endpoints:
 * - POST /api/v1/integrations/connect
 * - POST /api/v1/integrations/callback
 */

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryClient, queryKeys } from '@/lib/cache/query-client';
import { getGoogleOAuthRedirectUri } from '@/lib/integrations/google-oauth';

const PROVIDER = 'google_calendar' as const;
const OAUTH_RETURN_PATH_KEY = 'dqr:oauth-return-path';

export default function IntegrationConnectPanel() {
  const [message, setMessage] = useState('Ready to connect Google Calendar.');
  const redirectUri = getGoogleOAuthRedirectUri();

  const connectMutation = useMutation({
    mutationFn: apiClient.startIntegrationConnect,
    onSuccess: (result) => {
      setMessage('Redirecting to Google OAuth consent screen...');
      if (process.env.NODE_ENV === 'development') {
        console.log('[OAUTH] connect redirect_uri:', redirectUri);
      }
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, '/dashboard?tab=integrations&google=connected');
        window.location.assign(result.authorizationUrl);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setMessage(err?.message || 'Failed to start OAuth connect.');
    },
  });

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Google Calendar Connect</h2>
        <p className="text-sm text-muted-foreground">
          Start OAuth once for your account. Campaign sync actions are available from each campaign page.
        </p>
      </div>

      <button
        data-testid="integration-connect-trigger"
        type="button"
        disabled={connectMutation.isPending}
        onClick={() =>
          connectMutation.mutate({
            provider: PROVIDER,
            redirectUri,
          })
        }
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {connectMutation.isPending ? 'Opening Google OAuth...' : 'Start OAuth Connect'}
      </button>

      <p data-testid="integration-connect-message" className="text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}
