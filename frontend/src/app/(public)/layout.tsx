/**
 * Public Routes Layout
 * 
 * Unauthenticated pages: login, register, redirect validation
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

