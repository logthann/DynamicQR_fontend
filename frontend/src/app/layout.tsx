import type { Metadata, Viewport } from 'next';
import Providers from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dynamic QR - Frontend',
  description: 'QR code management platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

