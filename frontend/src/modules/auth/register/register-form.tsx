/**
 * Register Form Component
 *
 * Public route for new user registration.
 * Endpoint: POST /api/v1/auth/register
 *
 * Features:
 * - Email and password validation with zod
 * - React Hook Form for form state management
 * - Loading/error state display
 * - Redirect to login on success
 * - Recoverable error handling
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import type { RegisterRequest } from '@/lib/api/generated/types';

/**
 * Validation schema for register form
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  role: z.enum(['user', 'agency', 'admin']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const registerRequest: RegisterRequest = {
        email: data.email,
        password: data.password,
        company_name: data.companyName,
        role: data.role,
      };

      const response = await apiClient.register(registerRequest);

      // Success - redirect to login
      if (response.id) {
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      console.error('[REGISTER] Error:', err);
      setError(
        err.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-primary/20 bg-card p-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Create Account</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign up to get started with Dynamic QR
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company Name Field */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              {...register('companyName')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Acme Inc"
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-foreground">
              Role
            </label>
            <select
              id="role"
              {...register('role')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              defaultValue="user"
            >
              <option value="user">User</option>
              <option value="agency">Agency</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

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
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              className="mt-1 block w-full rounded border border-muted bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

