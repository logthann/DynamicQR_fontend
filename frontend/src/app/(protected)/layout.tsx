/**
 * Protected Routes Layout
 *
 * Authenticated pages: campaigns, qr, analytics, integrations.
 * Route-level auth enforcement is handled by middleware.
 */

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


