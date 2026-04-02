/**
 * Login Form Component
 *
 * Public route for user authentication.
 * Endpoint: POST /api/v1/auth/login
 *
 * Features:
 * - Email and password validation
 * - React Hook Form for form state
 * - Secure HttpOnly cookie session setup
 * - Protected navigation bootstrap after login
 * - Error handling and loading states
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { setAuthContext, setAuthToken } from '@/lib/api/auth-fetch';
import { queryClient } from '@/lib/cache/query-client';
import type { LoginRequest } from '@/lib/api/generated/types';

/**
 * Validation schema for login form
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const registered = searchParams.get('registered');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Handle form submission and login
   */
  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const loginRequest: LoginRequest = {
        email: data.email,
        password: data.password,
      };

      const response = await apiClient.login(loginRequest);

      // Support common token field variants from different backend serializers.
      const token =
        (response as any)?.token ??
        (response as any)?.access_token ??
        (response as any)?.accessToken;

      if (typeof token === 'string' && token.length > 0) {
        setAuthToken(token);
      }

      const responseUser = (response as any)?.user || {};
      const responseRole =
        (response as any)?.role ??
        responseUser?.role ??
        (response as any)?.user_role;
      const responseCompany =
        (response as any)?.company_name ??
        (response as any)?.companyName ??
        responseUser?.company_name ??
        responseUser?.companyName;
      const responseUserIdRaw = responseUser?.id ?? (response as any)?.user_id;
      const parsedUserId = Number(responseUserIdRaw);

      setAuthContext({
        ...(Number.isFinite(parsedUserId) ? { userId: parsedUserId } : {}),
        ...(typeof responseRole === 'string' ? { role: responseRole } : {}),
        ...(typeof responseCompany === 'string' ? { companyName: responseCompany } : {}),
      });

      // Prevent stale data from previous account/session causing RBAC mismatches.
      queryClient.clear();

      // If backend auth succeeded, continue to protected navigation.
      router.replace(redirectPath);
      router.refresh();
    } catch (err: any) {
      console.error('[LOGIN] Error:', err);
      setError(
        err.message || 'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-primary/20 bg-card p-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Sign In</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Access your Dynamic QR dashboard
        </p>

        {/* Success Message */}
        {registered && (
          <div className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary">
            Account created successfully! Please sign in.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <a href="/register" className="font-medium text-primary hover:underline">
              Create one
            </a>
          </p>

          {/* Forgot Password Link (placeholder) */}
          <p className="text-center text-xs text-muted-foreground">
            <a href="#" className="text-primary hover:underline">
              Forgot password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

