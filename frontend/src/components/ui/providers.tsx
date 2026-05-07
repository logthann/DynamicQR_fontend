'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/cache/query-client';
import { IntegrationProvider } from '@/state/integration-context';
import { LanguageProvider } from '@/contexts/language-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <IntegrationProvider>{children}</IntegrationProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

