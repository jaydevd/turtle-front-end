'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import GoogleIcon from '@mui/icons-material/Google';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { PageHeader, SettingsCard, DetailRow } from '@/components/ui/surfaces';
import { Field, PasswordField, SegmentedControl } from '@/components/ui/inputs';
import { ConfirmDialog, FormDialog } from '@/components/ui/dialogs';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAuth } from '@/lib/auth/AuthContext';
import { useThemeMode, type ThemeMode } from '@/theme/ThemeModeProvider';
import { errorMessage, isApiError } from '@/lib/api/client';
import { profileApi } from '@/lib/api/profile';
import { formatShortDate } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { radii } from '@/theme/tokens';
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
 * Destructive actions stay quiet on the page: a soft red wash that only deepens
 * on hover, rather than a full-bleed alert colour.
 */
const destructiveButtonSx = {
  backgroundColor: 'color-mix(in srgb, var(--mui-palette-error-main) 14%, transparent)',
  color: 'var(--mui-palette-error-main)',
  '&:hover': {
    backgroundColor: 'color-mix(in srgb, var(--mui-palette-error-main) 22%, transparent)',
  },
};

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
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            Google account
          </Typography>
          <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.35 }}>
            {user.google_connected
              ? user.google_email ?? 'Connected to Google'
              : 'Not connected'}
          </Typography>
        </Box>
        {user.google_connected ? (
          <Button
            variant="text"
            color="error"
            onClick={() => setConfirming(true)}
            disabled={needsPassword || disconnect.isPending}
            sx={[destructiveButtonSx, { flexShrink: 0 }]}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={handleConnect}
            disabled={linkStart.isPending}
            sx={{ flexShrink: 0, borderRadius: `${radii.pill}px` }}
          >
            {linkStart.isPending ? 'Opening…' : 'Connect'}
          </Button>
        )}
      </Stack>

      {user.google_connected && needsPassword ? (
        <Typography variant="caption" sx={{ color: colors.inkSoft, display: 'block', mt: 1 }}>
          Set a password before disconnecting.
        </Typography>
      ) : null}

      {notice ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {notice}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {errorMessage(error, 'Could not update the Google connection.')}
        </Alert>
      ) : null}

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
    </Box>
  );
}

export function SettingsView() {
  const router = useRouter();
  const { user, signOut, updateUser } = useAuth();
  const { preference, setPreference } = useThemeMode();
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [signingOut, setSigningOut] = useState(false);

  const [nameOpen, setNameOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameError, setNameError] = useState<unknown>(null);

  const setPassword = useSetPassword();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<unknown>(null);

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'No name set'
    : '';

  const nameFieldError = (field: 'first_name' | 'last_name') =>
    isApiError(nameError) ? nameError.fieldError(field) : undefined;

  const passwordFieldError = (field: string) =>
    isApiError(passwordError) ? passwordError.fieldError(field) : undefined;

  const confirmPasswordError =
    confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : undefined;

  const passwordReady = Boolean(
    newPassword.length > 0 &&
      newPassword === confirmPassword &&
      (!user?.has_password || currentPassword.length > 0),
  );

  function openNameEdit() {
    if (!user) return;
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setNameError(null);
    setNameOpen(true);
  }

  function openPasswordEdit() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordOpen(true);
  }

  async function handleSavePassword() {
    if (!user || !passwordReady) return;
    setPasswordError(null);
    try {
      // The response is the refreshed user, so `has_password` flips in the cache
      // and the persisted copy the shell greets from.
      const updated = await setPassword.mutateAsync({
        new_password: newPassword,
        ...(user.has_password ? { current_password: currentPassword } : {}),
      });
      updateUser(updated);
      toast({
        tone: 'success',
        message: user.has_password ? 'Password changed.' : 'Password set.',
      });
      setPasswordOpen(false);
    } catch (caught) {
      setPasswordError(caught);
    }
  }

  async function handleSaveName() {
    setNameError(null);
    try {
      const updated = await updateProfile.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      updateUser(updated);
      toast({ tone: 'success', message: 'Name updated.' });
      setNameOpen(false);
    } catch (caught) {
      setNameError(caught);
    }
  }

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
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Appearance, account and sign out."
      />

      <Stack spacing={3}>
        <SettingsCard title="Appearance" description="Stored on this device.">
          <Box sx={{ maxWidth: 360 }}>
            <SegmentedControl
              ariaLabel="Colour scheme"
              value={preference}
              options={THEME_OPTIONS}
              onChange={setPreference}
              fullWidth
            />
          </Box>
        </SettingsCard>

        <SettingsCard title="Account">
          {user ? (
            <Stack divider={<Divider />} spacing={2.5}>
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Name
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <IconButton
                    size="small"
                    edge="start"
                    onClick={openNameEdit}
                    aria-label="Edit name"
                    sx={{ color: colors.primaryInk }}
                  >
                    <EditOutlined sx={{ fontSize: 15 }} />
                  </IconButton>
                  <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                    {fullName}
                  </Typography>
                </Stack>
              </Stack>
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
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Password
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={openPasswordEdit}
                  sx={{ color: colors.primaryInk, fontWeight: 600, flexShrink: 0 }}
                >
                  {user.has_password ? 'Change' : 'Set password'}
                </Button>
              </Stack>

              <GoogleAccount user={user} />
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: colors.inkSoft }}>
              No account loaded.
            </Typography>
          )}
        </SettingsCard>

        <SettingsCard
          title="Log out"
          description="Remove the tokens stored on this device."
          action={
            <Button
              variant="text"
              color="error"
              startIcon={<LogoutRounded />}
              onClick={handleSignOut}
              disabled={signingOut}
              sx={[destructiveButtonSx, { flexShrink: 0 }]}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          }
        />
      </Stack>

      <FormDialog
        open={nameOpen}
        title="Edit name"
        confirmLabel="Save changes"
        busy={updateProfile.isPending}
        onConfirm={handleSaveName}
        onClose={() => setNameOpen(false)}
      >
        {nameError && !nameFieldError('first_name') && !nameFieldError('last_name') ? (
          <Alert severity="error">{errorMessage(nameError, 'Could not update your name.')}</Alert>
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Field
            label="First name"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
              setNameError(null);
            }}
            errorText={nameFieldError('first_name')}
            autoComplete="given-name"
            autoFocus
            slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);
              setNameError(null);
            }}
            errorText={nameFieldError('last_name')}
            autoComplete="family-name"
            slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
          />
        </Stack>
      </FormDialog>

      <FormDialog
        open={passwordOpen}
        title={user?.has_password ? 'Change password' : 'Set password'}
        description={
          user?.has_password
            ? 'Enter your current password, then choose a new one.'
            : 'Your Google sign in keeps working either way.'
        }
        confirmLabel={user?.has_password ? 'Change password' : 'Set password'}
        busy={setPassword.isPending}
        disabled={!passwordReady}
        onConfirm={handleSavePassword}
        onClose={() => setPasswordOpen(false)}
      >
        {passwordError &&
        !passwordFieldError('current_password') &&
        !passwordFieldError('new_password') ? (
          <Alert severity="error">
            {errorMessage(passwordError, 'Could not update your password.')}
          </Alert>
        ) : null}
        <Stack spacing={2.25}>
          {user?.has_password ? (
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={(value) => {
                setCurrentPassword(value);
                setPasswordError(null);
              }}
              errorText={passwordFieldError('current_password')}
              autoComplete="current-password"
            />
          ) : null}
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value);
              setPasswordError(null);
            }}
            errorText={passwordFieldError('new_password')}
            helperText="At least 8 characters, including a letter and a number."
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              setPasswordError(null);
            }}
            errorText={confirmPasswordError}
            autoComplete="new-password"
          />
        </Stack>
      </FormDialog>
    </Box>
  );
}
