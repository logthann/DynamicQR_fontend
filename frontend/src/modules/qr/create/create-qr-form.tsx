/**
 * Create QR Code Form Component
 *
 * Endpoints:
 * - POST /api/v1/qr (AC-005)
 * - GET /q/{short_code} (AC-006)
 *
 * Features:
 * - Campaign selection dropdown
 * - URL input field
 * - Form validation
 * - Mutation with loading/success/error states
 * - Preview redirect validation
 * - QR code display
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { queryKeys, staleTimes } from '@/lib/cache/query-client';
import type { Campaign, CreateQRRequest } from '@/lib/api/generated/types';
import QRCodePreview from '@/modules/qr/shared/qr-code-preview';

/**
 * Validation schema for create QR form
 */
const createQRSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  campaignId: z.string().min(1, 'Please select a campaign'),
  destination_url: z.string().url('Please enter a valid URL'),
  qr_type: z.enum(['url', 'event']),
  ga_measurement_id: z.string().max(100).optional().or(z.literal('')),
  utm_source: z.string().max(255).optional().or(z.literal('')),
  utm_medium: z.string().max(255).optional().or(z.literal('')),
  utm_campaign: z.string().max(255).optional().or(z.literal('')),
  design_config: z.string().optional().or(z.literal('')),
});

type CreateQRFormData = z.infer<typeof createQRSchema>;

export default function CreateQRForm() {
  const [successQR, setSuccessQR] = useState<{
    shortCode: string;
    destinationUrl: string;
    redirectUrl: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateQRFormData>({
    resolver: zodResolver(createQRSchema),
    defaultValues: {
      qr_type: 'url',
      design_config: '{"fg_color":"#ffffff","bg_color":"#121214"}',
    },
  });

  // Get campaigns for dropdown
  const {
    data: campaignsResponse,
    isLoading: campaignsLoading,
  } = useQuery({
    queryKey: queryKeys.campaigns.list(),
    queryFn: () => apiClient.getCampaigns(),
    staleTime: staleTimes.campaigns,
  });

  /**
   * AC-005: Mutation for creating QR code
   */
  const createQRMutation = useMutation({
    mutationFn: async (data: CreateQRRequest) => {
      return await apiClient.createQR(data);
    },
    onSuccess: (qr) => {
      // AC-006: Show preview with short-code redirect validation
      setSuccessQR({
        shortCode: qr.shortCode,
        destinationUrl: qr.destination_url,
        redirectUrl: `/q/${qr.shortCode}`,
      });
    },
    onError: (err: any) => {
      console.error('[CREATE_QR] Error:', err);
    },
  });

  const onSubmit = async (data: CreateQRFormData) => {
    let parsedDesignConfig: Record<string, unknown> | undefined;
    if (data.design_config && data.design_config.trim()) {
      try {
        parsedDesignConfig = JSON.parse(data.design_config);
      } catch {
        setError('design_config', {
          type: 'manual',
          message: 'design_config must be valid JSON',
        });
        return;
      }
    }

    const createRequest: CreateQRRequest = {
      name: data.name,
      campaign_id: Number(data.campaignId),
      destination_url: data.destination_url,
      qr_type: data.qr_type,
      ga_measurement_id: data.ga_measurement_id || undefined,
      utm_source: data.utm_source || undefined,
      utm_medium: data.utm_medium || undefined,
      utm_campaign: data.utm_campaign || undefined,
      design_config: parsedDesignConfig,
      status: 'active',
    };
    createQRMutation.mutate(createRequest);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create QR Code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a new QR code for your campaign
        </p>
      </div>

      {/* Success State - AC-006: Show QR preview */}
      {successQR && (
        <div className="rounded-lg border border-primary bg-primary/10 p-6">
          <h3 className="text-lg font-medium text-foreground">QR Code Created Successfully</h3>
          <p className="mt-2 text-sm text-muted-foreground">Short Code: {successQR.shortCode}</p>
          <p className="text-sm text-muted-foreground">
            Redirect URL: <code className="text-primary">/q/{successQR.shortCode}</code>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Points to: <code className="text-primary">{successQR.destinationUrl}</code>
          </p>
          <div className="mt-4">
            <QRCodePreview shortCode={successQR.shortCode} fileLabel={successQR.shortCode} />
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href={`/q/${successQR.shortCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Test Redirect
            </a>
            <button
              onClick={() => setSuccessQR(null)}
              className="rounded-md border border-muted bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Create Another
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {!successQR && (
        <div className="rounded-lg border border-muted bg-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campaign Selection */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                QR Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Black Friday Landing QR"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="campaignId" className="block text-sm font-medium text-foreground">
                Campaign
              </label>
              <select
                id="campaignId"
                {...register('campaignId')}
                disabled={campaignsLoading}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Select a campaign...</option>
                {campaignsResponse?.campaigns?.map((campaign: Campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
              {errors.campaignId && (
                <p className="mt-1 text-sm text-destructive">{errors.campaignId.message}</p>
              )}
            </div>

            {/* URL Field */}
            <div>
              <label htmlFor="destination_url" className="block text-sm font-medium text-foreground">
                Destination URL
              </label>
              <input
                id="destination_url"
                type="url"
                {...register('destination_url')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://example.com"
              />
              {errors.destination_url && (
                <p className="mt-1 text-sm text-destructive">{errors.destination_url.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="qr_type" className="block text-sm font-medium text-foreground">
                QR Type
              </label>
              <select
                id="qr_type"
                {...register('qr_type')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="url">url</option>
                <option value="event">event</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="ga_measurement_id" className="block text-sm font-medium text-foreground">
                  GA Measurement ID
                </label>
                <input
                  id="ga_measurement_id"
                  type="text"
                  {...register('ga_measurement_id')}
                  className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
                  placeholder="G-XXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="utm_source" className="block text-sm font-medium text-foreground">
                  UTM Source
                </label>
                <input
                  id="utm_source"
                  type="text"
                  {...register('utm_source')}
                  className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
                  placeholder="qr_print"
                />
              </div>
              <div>
                <label htmlFor="utm_medium" className="block text-sm font-medium text-foreground">
                  UTM Medium
                </label>
                <input
                  id="utm_medium"
                  type="text"
                  {...register('utm_medium')}
                  className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
                  placeholder="offline"
                />
              </div>
              <div>
                <label htmlFor="utm_campaign" className="block text-sm font-medium text-foreground">
                  UTM Campaign
                </label>
                <input
                  id="utm_campaign"
                  type="text"
                  {...register('utm_campaign')}
                  className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground"
                  placeholder="black_friday_2026"
                />
              </div>
            </div>

            <div>
              <label htmlFor="design_config" className="block text-sm font-medium text-foreground">
                Design Config (JSON)
              </label>
              <textarea
                id="design_config"
                {...register('design_config')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 font-mono text-xs text-foreground"
                rows={4}
              />
              {errors.design_config && (
                <p className="mt-1 text-sm text-destructive">{errors.design_config.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={createQRMutation.isPending}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createQRMutation.isPending ? 'Creating...' : 'Create QR Code'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

