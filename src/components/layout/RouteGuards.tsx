'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useAppScheme } from '@/theme/useAppScheme';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

/**
 * Blocks a protected screen until the stored session is known, then redirects
 * anonymous visitors. Rendering nothing during the check avoids flashing the
 * private layout before the redirect fires.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const { colors } = useAppScheme();

  useEffect(() => {
    if (status === 'anonymous') {
      const destination = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(destination)}`);
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: colors.canvas,
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  return <>{children}</>;
}

/** Keeps a signed-in user away from the login and signup screens. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const requested = new URLSearchParams(window.location.search).get('next');
      const destination = requested?.startsWith('/') && !requested.startsWith('//')
        ? requested
        : '/dashboard';
      router.replace(destination);
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return <>{children}</>;
}
