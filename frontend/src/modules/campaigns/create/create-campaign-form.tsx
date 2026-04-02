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
  status: z.enum(['active', 'paused', 'draft']),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
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
    defaultValues: {
      status: 'active',
    },
  });

  /**
   * Mutation for creating campaign
   * Invalidates campaigns list cache on success
   */
  const createMutation = useMutation({
    mutationFn: async (data: CreateCampaignRequest) => {
      return await apiClient.createCampaign(data);
    },
    onSuccess: () => {
      // AC-004: Invalidate campaigns list cache after mutation
      cacheInvalidations.createCampaign();

      // Redirect to dashboard campaigns tab
      router.push('/dashboard?tab=campaigns');
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
      status: data.status,
      description: data.description?.trim() || undefined,
      start_date: data.start_date,
      end_date: data.end_date,
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

          {/* Status Field */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-foreground">
              Status
            </label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-foreground">
                Start Date
              </label>
              <input
                id="start_date"
                type="date"
                {...register('start_date')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-foreground">
                End Date
              </label>
              <input
                id="end_date"
                type="date"
                {...register('end_date')}
                className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>
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

