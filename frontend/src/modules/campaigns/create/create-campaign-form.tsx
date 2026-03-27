/**
 * Create Campaign Form Component
 *
 * Endpoint: POST /api/v1/campaigns (AC-004)
 *
 * Features:
 * - Name and description fields
 * - Form validation (zod)
 * - Mutation with React Query
 * - Cache invalidation on success (campaigns list)
 * - Loading and error states
 * - Redirect to campaigns list on success
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { cacheInvalidations } from '@/lib/cache/query-client';
import type { CreateCampaignRequest } from '@/lib/api/generated/types';

/**
 * Validation schema for create campaign form
 */
const createCampaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  description: z.string().optional(),
});

type CreateCampaignFormData = z.infer<typeof createCampaignSchema>;

export default function CreateCampaignForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
  });

  /**
   * Mutation for creating campaign
   * Invalidates campaigns list cache on success
   */
  const createMutation = useMutation({
    mutationFn: async (data: CreateCampaignRequest) => {
      return await apiClient.createCampaign(data);
    },
    onSuccess: (campaign) => {
      // AC-004: Invalidate campaigns list cache after mutation
      cacheInvalidations.createCampaign();

      // Redirect to campaigns list
      router.push('/campaigns');
    },
    onError: (err: any) => {
      console.error('[CREATE_CAMPAIGN] Error:', err);
      setError(
        err.message || 'Failed to create campaign. Please try again.'
      );
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: CreateCampaignFormData) => {
    setError(null);
    const createRequest: CreateCampaignRequest = {
      name: data.name,
      description: data.description,
    };
    createMutation.mutate(createRequest);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new campaign to track and manage QR codes
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-lg border border-muted bg-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Campaign Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Summer Promotion 2026"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              Description (Optional)
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe the campaign purpose, target audience, or any notes..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-muted bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

