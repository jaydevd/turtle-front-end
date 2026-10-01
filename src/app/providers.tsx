'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssVarsProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeModeProvider } from '@/theme/ThemeModeProvider';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { isApiError } from '@/lib/api/client';
import { createAppTheme } from '@/theme/createAppTheme';

const displayFont = 'var(--font-display), Georgia, "Times New Roman", serif';
const sansFont = 'var(--font-sans), ui-sans-serif, system-ui, -apple-system, sans-serif';
const monoFont = 'var(--font-mono), ui-monospace, SFMono-Regular, monospace';

const theme = createAppTheme({
  display: displayFont,
  sans: sansFont,
  mono: monoFont,
});

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Habit data is small and always fresh; avoid a refetch storm on focus.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth or validation failures.
          if (isApiError(error) && error.isUnauthorized) return false;
          if (isApiError(error) && error.isValidation) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <AppRouterCacheProvider options={{ key: 'habit-tracker' }}>
      <CssVarsProvider theme={theme} defaultMode="light">
        <ThemeModeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeModeProvider>
      </CssVarsProvider>
    </AppRouterCacheProvider>
  );
}
