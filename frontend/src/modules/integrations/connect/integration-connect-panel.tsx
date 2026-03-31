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
import type { IntegrationProvider } from '@/lib/api/generated/types';

const DEFAULT_PROVIDER: IntegrationProvider = 'google_calendar';

export default function IntegrationConnectPanel() {
  const [provider, setProvider] = useState<IntegrationProvider>(DEFAULT_PROVIDER);
  const [oauthState, setOAuthState] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [callbackCode, setCallbackCode] = useState('');
  const [callbackState, setCallbackState] = useState('');
  const [message, setMessage] = useState('No OAuth operation executed yet.');

  const connectMutation = useMutation({
    mutationFn: apiClient.startIntegrationConnect,
    onSuccess: (result) => {
      setOAuthState(result.state);
      setCallbackState(result.state);
      setAuthorizationUrl(result.authorizationUrl);
      setMessage('Connect URL generated. Continue OAuth consent then submit callback.');
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setMessage(err?.message || 'Failed to start OAuth connect.');
    },
  });

  const callbackMutation = useMutation({
    mutationFn: apiClient.handleIntegrationCallback,
    onSuccess: (result) => {
      setMessage(result.message || `Callback finished with status: ${result.status}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (err: any) => {
      setMessage(err?.message || 'Failed to complete OAuth callback.');
    },
  });

  return (
    <section className="space-y-4 rounded-lg border border-muted bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">OAuth Connect</h2>
        <p className="text-sm text-muted-foreground">
          Start provider OAuth and submit callback payload.
        </p>
      </div>

      <label className="block text-sm text-foreground">
        Provider
        <select
          data-testid="integration-provider-select"
          value={provider}
          onChange={(event) => setProvider(event.target.value as IntegrationProvider)}
          className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
        >
          <option value="google_calendar">google_calendar</option>
          <option value="google_analytics">google_analytics</option>
        </select>
      </label>

      <button
        data-testid="integration-connect-trigger"
        type="button"
        disabled={connectMutation.isPending}
        onClick={() => connectMutation.mutate({ provider })}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {connectMutation.isPending ? 'Generating URL...' : 'Start OAuth Connect'}
      </button>

      {authorizationUrl && (
        <div className="rounded-md border border-muted p-3">
          <p className="text-xs text-muted-foreground">Authorization URL</p>
          <a
            data-testid="integration-authorization-url"
            href={authorizationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-sm text-primary underline"
          >
            {authorizationUrl}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">State: {oauthState}</p>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-muted p-4">
        <h3 className="text-sm font-semibold text-foreground">Submit Callback</h3>

        <label className="block text-sm text-foreground">
          OAuth code
          <input
            data-testid="integration-callback-code"
            value={callbackCode}
            onChange={(event) => setCallbackCode(event.target.value)}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
            placeholder="Paste callback code"
          />
        </label>

        <label className="block text-sm text-foreground">
          OAuth state
          <input
            data-testid="integration-callback-state"
            value={callbackState}
            onChange={(event) => setCallbackState(event.target.value)}
            className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
            placeholder="Paste callback state"
          />
        </label>

        <button
          data-testid="integration-callback-trigger"
          type="button"
          disabled={!callbackCode || !callbackState || callbackMutation.isPending}
          onClick={() =>
            callbackMutation.mutate({
              provider,
              code: callbackCode,
              state: callbackState,
            })
          }
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {callbackMutation.isPending ? 'Submitting callback...' : 'Submit Callback'}
        </button>
      </div>

      <p data-testid="integration-connect-message" className="text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}

