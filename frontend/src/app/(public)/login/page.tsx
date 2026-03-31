/**
 * Login Page
 *
 * Public route: /login
 * Displays login form for user authentication
 */

import { Suspense } from 'react';
import LoginForm from '@/modules/auth/login/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

