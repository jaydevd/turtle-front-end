'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Surface } from '@/components/ui/surfaces';
import { useAuth } from '@/lib/auth/AuthContext';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type { AuthPayload } from '@/types/api';

/**
 * What the backend puts in `?error=` when a Google sign-in did not produce a
 * session. Anything unrecognised falls back to the generic message, since the
 * value comes off the query string and is not ours to trust.
 */
const FAILURE_COPY: Record<string, string> = {
  access_denied: 'You cancelled the Google sign in. Nothing has changed.',
  account_exists:
    'An account already uses that email address. Sign in with your password instead.',
  account_inactive: 'That account has been deactivated.',
  google_unavailable: 'Google sign in is not available on this server right now.',
  sign_in_failed: 'Google sign in could not be completed. Please try again.',
};

const GENERIC_FAILURE = FAILURE_COPY.sign_in_failed;

/**
 * Landing page for the Google redirect.
 *
 * Deliberately outside the `(auth)` route group: that layout wraps its children
 * in `RedirectIfAuthenticated`, which would race the navigation this page is
 * about to perform.
 *
 * The session arrives in the URL fragment, which is why it is safe there - a
 * browser never sends a fragment to a server, so the tokens cannot reach the
 * proxy's or Django's logs. The fragment is stripped from the address bar and
 * this tab's history before anything reads it.
 */
export function GoogleCallbackView() {
  const router = useRouter();
  const { status, adoptSession } = useAuth();
  const { colors } = useAppScheme();
  const [failure, setFailure] = useState<string | null>(null);
  const handled = useRef(false);

  /*
   * Waits for the provider to finish restoring any existing session before
   * applying this one. A child's effect runs before its parent's, so without
   * this the restore would race the adoption and could clear the tokens the
   * redirect just delivered.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status === 'loading' || handled.current) return;
    handled.current = true;

    const { search, hash, pathname } = window.location;
    // Replace rather than push: the entry holding the tokens must not survive
    // in this tab's history for a Back press to reveal.
    window.history.replaceState(null, '', pathname);

    const params = new URLSearchParams(search);

    // A connect from Settings comes back through this page as well - there is
    // only one registered redirect URI - but it has no session to adopt, only a
    // yes or a no, and both belong on the page that asked for it.
    const link = params.get('link');
    if (link) {
      router.replace(linkOutcomeUrl(link, params));
      return;
    }

    const reason = params.get('error');
    if (reason) {
      setFailure(reason);
      return;
    }

    const encoded = new URLSearchParams(hash.slice(1)).get('payload');
    const payload = encoded ? parsePayload(encoded) : null;
    if (!payload) {
      setFailure('sign_in_failed');
      return;
    }

    adoptSession(payload);

    const next = params.get('next');
    router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  }, [status, adoptSession, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (failure) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          px: 2.5,
          py: 8,
        }}
      >
        <Surface sx={{ width: '100%', maxWidth: 430 }}>
          <Stack spacing={2.25}>
            <Typography variant="overline" sx={{ color: 'primary.main' }}>
              Sign in
            </Typography>
            <Typography variant="h2" sx={{ fontSize: '1.6rem' }}>
              That did not work
            </Typography>
            <Alert severity="error">{FAILURE_COPY[failure] ?? GENERIC_FAILURE}</Alert>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="large"
              fullWidth
              sx={{ borderRadius: `${radii.pill}px` }}
            >
              Back to sign in
            </Button>
          </Stack>
        </Surface>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2.5,
        color: colors.inkSoft,
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <CircularProgress size={26} />
        <Typography variant="body2">Finishing sign in…</Typography>
      </Stack>
    </Box>
  );
}

/** Where to forward a connect outcome so the page that asked can show it. */
function linkOutcomeUrl(link: string, params: URLSearchParams): string {
  const next = params.get('next');
  const to = next?.startsWith('/') && !next.startsWith('//') ? next : '/settings';
  const join = to.includes('?') ? '&' : '?';

  if (link === 'connected') return `${to}${join}google=connected`;
  const reason = params.get('reason') ?? 'link_failed';
  return `${to}${join}google=failed&reason=${encodeURIComponent(reason)}`;
}

/** Read the `{tokens, user}` blob, rejecting anything not shaped like one. */
function parsePayload(encoded: string): AuthPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const { tokens, user } = parsed as Partial<AuthPayload>;

  if (
    typeof tokens?.access !== 'string' ||
    typeof tokens.refresh !== 'string' ||
    typeof user?.id !== 'string' ||
    typeof user.email !== 'string'
  ) {
    return null;
  }

  return parsed as AuthPayload;
}