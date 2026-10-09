'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import CloudOutlined from '@mui/icons-material/CloudOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import { PageHeader, Section, Surface, DetailRow } from '@/components/ui/surfaces';
import { Field, PasswordField, SegmentedControl } from '@/components/ui/inputs';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAuth } from '@/lib/auth/AuthContext';
import { useThemeMode, type ThemeMode } from '@/theme/ThemeModeProvider';
import { API_BASE_URL, errorMessage, isApiError } from '@/lib/api/client';
import { profileApi } from '@/lib/api/profile';
import { formatShortDate } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { statusLabels } from '@/components/ui/pills';
import { radii } from '@/theme/tokens';
import { tabularNums } from '@/theme/typography';
import {
  useUpdateProfile,
  useSetPassword,
  useGoogleLinkStart,
  useDisconnectGoogle,
} from '@/lib/query/hooks';
import type { GoogleLinkFailure, User } from '@/types/api';

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const NAME_MAX_LENGTH = 150;

/**
 * First and last name are the only self-editable fields the backend exposes, so
 * this form deliberately leaves every other account detail read-only below it.
 */
function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const { colors } = useAppScheme();
  const updateProfile = useUpdateProfile();

  // Seeded once from the cached user. The parent keys this component on the
  // stored names, so a successful save remounts it with the server values
  // rather than syncing props into state through an effect.
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [error, setError] = useState<unknown>(null);

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const unchanged =
    trimmedFirst === user.first_name && trimmedLast === user.last_name;

  const fieldError = (field: 'first_name' | 'last_name') =>
    isApiError(error) ? error.fieldError(field) : undefined;

  const hasFieldError = Boolean(fieldError('first_name') || fieldError('last_name'));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const updated = await updateProfile.mutateAsync({
        first_name: trimmedFirst,
        last_name: trimmedLast,
      });
      // Both caches are updated: the query cache for this screen and the
      // persisted user that the shell greets from.
      updateUser(updated);
      toast({ tone: 'success', message: 'Name updated.' });
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
      {error && !hasFieldError ? (
        <Alert severity="error">{errorMessage(error, 'Could not update your name.')}</Alert>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Field
          label="First name"
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);
            setError(null);
          }}
          errorText={fieldError('first_name')}
          autoComplete="given-name"
          slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
        />
        <Field
          label="Last name"
          value={lastName}
          onChange={(event) => {
            setLastName(event.target.value);
            setError(null);
          }}
          errorText={fieldError('last_name')}
          autoComplete="family-name"
          slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
        />
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={updateProfile.isPending || unchanged}
          sx={{ borderRadius: `${radii.pill}px` }}
        >
          {updateProfile.isPending ? 'Saving…' : 'Save name'}
        </Button>
        {unchanged && !updateProfile.isPending ? (
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            No changes to save.
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

/**
 * An account created through Google has no password at all, so this is the only
 * way it can ever sign in with one too. It disappears once a password exists:
 * changing one after that needs the current password, and this form has no field
 * for it.
 */
function PasswordForm() {
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const { colors } = useAppScheme();
  const setPassword = useSetPassword();

  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<unknown>(null);

  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

  const confirmError = confirm && password !== confirm ? 'Passwords do not match.' : undefined;
  const ready = password.length > 0 && password === confirm;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;

    setError(null);
    try {
      // The response is the refreshed user, so the persisted copy - the one the
      // shell greets from - learns the account has a password now.
      const updated = await setPassword.mutateAsync({ new_password: password });
      updateUser(updated);
      toast({ tone: 'success', message: 'Password set.' });
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
      <Box>
        <Typography variant="h5" sx={{ fontSize: '1.0625rem' }}>
          Set a password
        </Typography>
        <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.5, maxWidth: 460 }}>
          You signed in with Google, so this account has no password yet. Add one to sign in with
          your email address too.
        </Typography>
      </Box>

      {error && !fieldError('new_password') ? (
        <Alert severity="error">{errorMessage(error, 'Could not set your password.')}</Alert>
      ) : null}

      <Box sx={{ maxWidth: 420 }}>
        <PasswordField
          label="New password"
          value={password}
          onChange={(value) => {
            setPasswordValue(value);
            setError(null);
          }}
          errorText={fieldError('new_password')}
          helperText="At least 8 characters, including a letter and a number."
          autoComplete="new-password"
        />
      </Box>

      <Box sx={{ maxWidth: 420 }}>
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            setError(null);
          }}
          errorText={confirmError}
          autoComplete="new-password"
        />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={setPassword.isPending || !ready}
          sx={{ borderRadius: `${radii.pill}px` }}
        >
          {setPassword.isPending ? 'Saving…' : 'Set password'}
        </Button>
        <Typography variant="caption" sx={{ color: colors.inkSoft }}>
          Google sign in keeps working either way.
        </Typography>
      </Stack>
    </Stack>
  );
}

/**
 * Why a connect round trip can come back without a connection. Anything
 * unrecognised falls back to the generic message: the reason arrives on the
 * query string and is not ours to trust.
 */
const LINK_FAILURE_COPY: Record<GoogleLinkFailure, string> = {
  access_denied: 'You cancelled the Google connection. Nothing has changed.',
  google_taken: 'That Google account is already connected to a different account.',
  link_failed: 'Google could not be connected. Please try again.',
};

function linkFailureMessage(reason: string | null): string {
  const match = Object.entries(LINK_FAILURE_COPY).find(([key]) => key === reason);
  return match?.[1] ?? LINK_FAILURE_COPY.link_failed;
}

/**
 * Connecting a Google account to this one, or disconnecting it.
 *
 * Connecting is a round trip through Google that ends in a full page load back
 * here, so its outcome only survives in the query string - which is also why the
 * profile is refetched afterwards rather than trusting the copy the shell
 * persisted before the round trip.
 */
function GoogleAccount({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const { colors } = useAppScheme();
  const linkStart = useGoogleLinkStart();
  const disconnect = useDisconnectGoogle();

  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<unknown>(null);

  /*
   * The outcome arrives as a query string on a page the server never rendered,
   * so it can only be read after mount. It is scrubbed from the address bar
   * first, so a reload cannot replay the message.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('google');
    if (!outcome) return;

    window.history.replaceState(null, '', window.location.pathname);

    if (outcome === 'connected') {
      toast({ tone: 'success', message: 'Google account connected.' });
    } else {
      setNotice(linkFailureMessage(params.get('reason')));
    }

    // The persisted user predates the round trip, so it still reports nothing
    // connected. Refetch rather than leave Settings to contradict the server.
    void profileApi.getProfile().then(updateUser).catch(() => undefined);
  }, [toast, updateUser]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Without a password the link is the only key this account owns, so the
  // backend refuses to drop it - and so does the button below.
  const needsPassword = user.google_connected && !user.has_password;

  async function handleConnect() {
    setError(null);
    setNotice(null);
    try {
      // The page leaves for Google here. The outcome comes back as a redirect
      // to this page rather than as this call's response.
      window.location.assign(await linkStart.mutateAsync('/settings'));
    } catch (caught) {
      setError(caught);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setNotice(null);
    try {
      // The response is the refreshed user, so `google_connected` flips in the
      // shell as well as in the query cache.
      const updated = await disconnect.mutateAsync();
      updateUser(updated);
      setConfirming(false);
      toast({ tone: 'info', message: 'Google disconnected.' });
    } catch (caught) {
      setError(caught);
      setConfirming(false);
    }
  }

  return (
    <Section
      title="Google account"
      description={
        user.google_connected
          ? 'Google is linked to this account, so it can be used to sign in alongside your email and password.'
          : 'Link a Google account to be able to sign in with it in future. Your current way of signing in keeps working either way.'
      }
    >
      <Stack divider={<Divider />} spacing={2.5}>
        {notice ? <Alert severity="error">{notice}</Alert> : null}
        {error ? (
          <Alert severity="error">
            {errorMessage(error, 'Could not update the Google connection.')}
          </Alert>
        ) : null}

        {user.google_connected ? (
          <>
            <DetailRow label="Connected as" value={user.google_email ?? 'Google account'} />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Typography variant="body2" sx={{ color: colors.inkSoft, maxWidth: 420 }}>
                {needsPassword
                  ? 'Set a password first, so Google is not the only way back into this account.'
                  : 'Disconnecting stops Google sign in for this account. You can link it again at any time.'}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setConfirming(true)}
                disabled={needsPassword || disconnect.isPending}
                sx={{ flexShrink: 0 }}
              >
                Disconnect
              </Button>
            </Stack>
          </>
        ) : (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="body2" sx={{ color: colors.inkSoft, maxWidth: 420 }}>
              You will choose the Google account on Google&apos;s own consent screen, and can
              withdraw access from your Google account at any time.
            </Typography>
            <Button
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleConnect}
              disabled={linkStart.isPending}
              sx={{ flexShrink: 0, borderRadius: `${radii.pill}px` }}
            >
              {linkStart.isPending ? 'Opening Google…' : 'Connect to Google'}
            </Button>
          </Stack>
        )}
      </Stack>

      <ConfirmDialog
        open={confirming}
        title="Disconnect Google?"
        message="You will no longer be able to sign in with Google. Signing in with your email and password is unaffected, and you can link the account again later."
        confirmLabel="Disconnect"
        tone="danger"
        busy={disconnect.isPending}
        onConfirm={handleDisconnect}
        onClose={() => setConfirming(false)}
      />
    </Section>
  );
}

export function SettingsView() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useThemeMode();
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast({ tone: 'info', message: 'Signed out.' });
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Appearance, account details and the session behind this device."
      />

      <Stack spacing={3}>
        <Section
          title="Appearance"
          description="System follows your device setting. The choice is stored on this device only."
        >
          <Box sx={{ maxWidth: 360 }}>
            <SegmentedControl
              ariaLabel="Colour scheme"
              value={preference}
              options={THEME_OPTIONS}
              onChange={setPreference}
              fullWidth
            />
          </Box>
        </Section>

        <Section title="Account" description="Your name is used as the greeting in the app. Email and role are fixed.">
          {user ? (
            <Stack divider={<Divider />} spacing={2.5}>
              <ProfileForm
                key={`${user.first_name}:${user.last_name}`}
                user={user}
              />
              <DetailRow label="Email" value={user.email} />
              <DetailRow
                label="Role"
                value={
                  <Box
                    component="span"
                    sx={{ color: colors.primaryInk, textTransform: 'capitalize' }}
                  >
                    {user.user_role}
                  </Box>
                }
              />
              <DetailRow label="Member since" value={formatShortDate(user.created_at)} />
              <DetailRow
                label="User ID"
                value={
                  <Box
                    component="span"
                    sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', ...tabularNums }}
                  >
                    {user.id}
                  </Box>
                }
              />
              {!user.has_password ? <PasswordForm /> : null}
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: colors.inkSoft }}>
              No account loaded.
            </Typography>
          )}
        </Section>

        {user ? <GoogleAccount user={user} /> : null}

        <Section title="Session" description="Signing out clears the tokens on this device.">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: colors.inkSoft, maxWidth: 420 }}>
              The backend does not blacklist refresh tokens, so signing out removes them locally.
              Anyone with the old token could still use it until it expires.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutRounded />}
              onClick={handleSignOut}
              disabled={signingOut}
              sx={{ flexShrink: 0 }}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </Stack>
        </Section>

        <Surface>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: colors.primaryWash,
                color: colors.primaryInk,
                flexShrink: 0,
              }}
            >
              <CloudOutlined sx={{ fontSize: 17 }} />
            </Box>
            <Box>
              <Typography variant="h5">API connection</Typography>
              <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.5 }}>
                Requests go to{' '}
                <Box component="span" sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  {API_BASE_URL}
                </Box>
                , proxied through the Next.js server to Django. Timestamps are Unix seconds and days
                are UTC midnight.
              </Typography>
              <Typography variant="caption" sx={{ color: colors.inkSoft, display: 'block', mt: 1 }}>
                {`Habit statuses: ${statusLabels.ACTIVE}, ${statusLabels.COMPLETED}, ${statusLabels.PARTIAL}, ${statusLabels.MISSED} and ${statusLabels.SKIPPED}.`}
              </Typography>
            </Box>
          </Stack>
        </Surface>
      </Stack>
    </>
  );
}
