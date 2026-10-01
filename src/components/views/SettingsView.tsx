'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import CloudOutlined from '@mui/icons-material/CloudOutlined';
import { PageHeader, Section, Surface, DetailRow } from '@/components/ui/surfaces';
import { Field, SegmentedControl } from '@/components/ui/inputs';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAuth } from '@/lib/auth/AuthContext';
import { useThemeMode, type ThemeMode } from '@/theme/ThemeModeProvider';
import { API_BASE_URL, errorMessage, isApiError } from '@/lib/api/client';
import { formatShortDate } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { statusLabels } from '@/components/ui/pills';
import { radii } from '@/theme/tokens';
import { tabularNums } from '@/theme/typography';
import { useUpdateProfile } from '@/lib/query/hooks';
import type { User } from '@/types/api';

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

        <Section title="Account" description="Your name is used as the greeting in the app. Everything else here is fixed.">
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
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: colors.inkSoft }}>
              No account loaded.
            </Typography>
          )}
        </Section>

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
