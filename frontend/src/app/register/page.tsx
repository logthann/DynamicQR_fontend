/**
 * Register Page
 *
 * Public route: /register
 * Displays register form for new users
 */

import RegisterForm from '@/modules/auth/register/register-form';

export const metadata = {
  title: 'Register | Dynamic QR',
  description: 'Create a new Dynamic QR account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
