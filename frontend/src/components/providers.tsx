'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/cache/query-client';
import { IntegrationProvider } from '@/state/integration-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <IntegrationProvider>{children}</IntegrationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

