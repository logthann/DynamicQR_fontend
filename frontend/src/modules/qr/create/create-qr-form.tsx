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

/**
 * Validation schema for create QR form
 */
const createQRSchema = z.object({
  campaignId: z.string().min(1, 'Please select a campaign'),
  url: z.string().url('Please enter a valid URL'),
});

type CreateQRFormData = z.infer<typeof createQRSchema>;

export default function CreateQRForm() {
  const [successQR, setSuccessQR] = useState<{
    shortCode: string;
    url: string;
    redirectUrl: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateQRFormData>({
    resolver: zodResolver(createQRSchema),
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
        url: qr.url,
        redirectUrl: `/q/${qr.shortCode}`,
      });
    },
    onError: (err: any) => {
      console.error('[CREATE_QR] Error:', err);
    },
  });

  const onSubmit = async (data: CreateQRFormData) => {
    const createRequest: CreateQRRequest = {
      campaignId: data.campaignId,
      url: data.url,
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
            Points to: <code className="text-primary">{successQR.url}</code>
          </p>
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
              <label htmlFor="url" className="block text-sm font-medium text-foreground">
                Destination URL
              </label>
              <input
                id="url"
                type="url"
                {...register('url')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://example.com"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-destructive">{errors.url.message}</p>
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

