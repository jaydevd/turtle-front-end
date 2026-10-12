'use client';

import { Field, PasswordField } from '@/components/ui/inputs';
import { Surface } from '@/components/ui/surfaces';
import { errorMessage, isApiError } from '@/lib/api/client';
import { authApi, googleSignInUrl } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/AuthContext';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import {
    Alert,
    Box,
    Button,
    Stack,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where the user was headed before being sent to sign in. Guarded the same way
 * on both sides of the Google round trip: the backend signs the destination into
 * the OAuth `state` and will not carry anything that is not a rooted path.
 */
function requestedNext(): string | undefined {
  const requested = new URLSearchParams(window.location.search).get('next');
  return requested?.startsWith('/') && !requested.startsWith('//')
    ? requested
    : undefined;
}

function authenticatedDestination(): string {
  return requestedNext() ?? '/dashboard';
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  return undefined;
}

function validateNewPassword(password: string): string | undefined {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  return undefined;
}

/**
 * The four-colour G. Google's brand rules only permit this mark as-is, so it is
 * inlined rather than approximated, and it is decorative - the button's own label
 * already says who it belongs to.
 */
function GoogleMark() {
  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
      sx={{ width: 18, height: 18, flexShrink: 0 }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Box>
  );
}

/** Only the rules are decorative; the label still tells a screen reader there is a second way in. */
function AuthDivider({ label }: { label: string }) {
  const { colors } = useAppScheme();
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box aria-hidden="true" sx={{ flex: 1, height: '1px', backgroundColor: colors.hairline }} />
      <Typography variant="caption" sx={{ color: colors.inkSoft }}>
        {label}
      </Typography>
      <Box aria-hidden="true" sx={{ flex: 1, height: '1px', backgroundColor: colors.hairline }} />
    </Stack>
  );
}

/**
 * Signing in with Google is a navigation away and back, not a request this client
 * makes: the backend redirects to Google and returns with a session in the URL.
 * So the destination is resolved at click time - reading `window` during render
 * would break the server-rendered pass - and the button is a plain `button` so it
 * can never submit the form it happens to sit inside.
 */
function GoogleButton() {
  return (
    <Button
      type="button"
      variant="outlined"
      size="large"
      fullWidth
      onClick={() => window.location.assign(googleSignInUrl(requestedNext()))}
      startIcon={<GoogleMark />}
      sx={{ borderRadius: `${radii.pill}px` }}
    >
      Continue with Google
    </Button>
  );
}

interface AuthCardProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

function AuthCard({ eyebrow, title, description, children, footer }: AuthCardProps) {
  const { colors } = useAppScheme();
  return (
    <Surface sx={{ width: '100%', maxWidth: 430, p: { xs: 3, sm: 4 } }}>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="overline" sx={{ color: 'primary.main' }}>
          {eyebrow}
        </Typography>
        <Typography variant="h2" sx={{ fontSize: '1.9rem' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.5 }}>
          {description}
        </Typography>
      </Stack>
      {children}
      <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${colors.hairline}` }}>{footer}</Box>
    </Surface>
  );
}

export function LoginView() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useAppScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [resetNotice, setResetNotice] = useState(false);

  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

  /*
   * The reset page sends the user here with `?reset=1` once the password is
   * changed. It is read after mount and scrubbed from the address bar, so a
   * reload cannot replay the notice.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== '1') return;
    setResetNotice(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationErrors: Record<string, string> = {};
    const emailValidationError = validateEmail(email);
    if (emailValidationError) validationErrors.email = emailValidationError;
    if (!password) validationErrors.password = 'Enter your password.';
    setClientErrors(validationErrors);
    setError(null);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace(authenticatedDestination());
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      description="Pick up where you left off and keep the streak alive."
      footer={
        <Typography variant="body2" sx={{ color: colors.inkSoft }}>
          New here?{' '}
          <Typography
            component={Link}
            href="/signup"
            onClick={(event) => {
              const next = new URLSearchParams(window.location.search).get('next');
              if (next) {
                event.preventDefault();
                router.push(`/signup?next=${encodeURIComponent(next)}`);
              }
            }}
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 600 }}
          >
            Create an account
          </Typography>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
        <GoogleButton />
        <AuthDivider label="or" />
        {error && !fieldError('email') && !fieldError('password') ? (
          <Alert severity="error">
            {isApiError(error) && error.isValidation
              ? fieldError('non_field_errors') ?? 'Invalid email or password.'
              : errorMessage(error, 'Could not sign you in.')}
          </Alert>
        ) : null}
        {resetNotice ? (
          <Alert severity="success">
            Your password has been changed. Sign in with your new one.
          </Alert>
        ) : null}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
            setClientErrors((current) => ({ ...current, email: '' }));
          }}
          errorText={clientErrors.email || fieldError('email')}
          autoComplete="email"
          autoFocus
          required
          slotProps={{ htmlInput: { maxLength: 254 } }}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError(null);
            setClientErrors((current) => ({ ...current, password: '' }));
          }}
          errorText={clientErrors.password || fieldError('password')}
          autoComplete="current-password"
          required
        />
        <Box sx={{ textAlign: 'right', mt: -1.25 }}>
          <Typography
            component={Link}
            href="/forgot-password"
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 600 }}
          >
            Forgot password?
          </Typography>
        </Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={submitting || !email || !password}
          sx={{ mt: 0.5, borderRadius: `${radii.pill}px` }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </AuthCard>
  );
}

export function SignUpView() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors } = useAppScheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

  /*
   * An invitation email links here with the invited address, so the account the
   * newcomer creates is the one the waiting join request is addressed to. Read
   * after mount, matching the reset notice below.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const invited = new URLSearchParams(window.location.search).get('email');
    if (invited) setEmail(invited);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationErrors: Record<string, string> = {};
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validateNewPassword(password);
    if (emailValidationError) validationErrors.email = emailValidationError;
    if (passwordValidationError) validationErrors.password = passwordValidationError;
    if (password !== confirm) {
      validationErrors.confirm = 'Passwords do not match.';
    }
    setClientErrors(validationErrors);
    setConfirmError(validationErrors.confirm);
    setError(null);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      await signUp({ email, password, first_name: firstName, last_name: lastName });
      router.replace(authenticatedDestination());
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  const hasFieldErrors = Boolean(
    fieldError('email') || fieldError('password') || fieldError('first_name') || fieldError('last_name'),
  );

  return (
    <AuthCard
      eyebrow="Get started"
      title="Create your account"
      description="It takes a moment. Then it is one tap a day."
      footer={
        <Typography variant="body2" sx={{ color: colors.inkSoft }}>
          Already have an account?{' '}
          <Typography
            component={Link}
            href="/login"
            onClick={(event) => {
              const next = new URLSearchParams(window.location.search).get('next');
              if (next) {
                event.preventDefault();
                router.push(`/login?next=${encodeURIComponent(next)}`);
              }
            }}
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 600 }}
          >
            Sign in
          </Typography>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
        <GoogleButton />
        <AuthDivider label="or" />
        {error && !hasFieldErrors ? (
          <Alert severity="error">{errorMessage(error, 'Could not create your account.')}</Alert>
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Field
            label="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            errorText={fieldError('first_name')}
            autoComplete="given-name"
            autoFocus
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            errorText={fieldError('last_name')}
            autoComplete="family-name"
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />
        </Stack>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
            setClientErrors((current) => ({ ...current, email: '' }));
          }}
          errorText={clientErrors.email || fieldError('email')}
          autoComplete="email"
          required
          slotProps={{ htmlInput: { maxLength: 254 } }}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError(null);
            setClientErrors((current) => ({ ...current, password: '' }));
            if (confirmError) setConfirmError(undefined);
          }}
          errorText={clientErrors.password || fieldError('password')}
          helperText="At least 8 characters, including a letter and a number."
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            setClientErrors((current) => ({ ...current, confirm: '' }));
            if (confirmError) setConfirmError(undefined);
          }}
          errorText={clientErrors.confirm || confirmError}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={submitting || !email || !password || !confirm}
          sx={{ mt: 0.5, borderRadius: `${radii.pill}px` }}
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>
    </AuthCard>
  );
}

/**
 * Asks for the address to send a reset link to.
 *
 * The backend answers identically whether or not the address has an account, so
 * the confirmation copy says "if" rather than confirming delivery - which is
 * also why a failed request is the only way to tell the two apart, and is shown
 * as an error rather than the success state.
 */
export function ForgotPasswordView() {
  const { colors } = useAppScheme();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const emailValidationError = validateEmail(email);
    setClientErrors(emailValidationError ? { email: emailValidationError } : {});
    setError(null);
    if (emailValidationError) return;

    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        eyebrow="Check your inbox"
        title="Reset link sent"
        description="It should arrive in a minute or two."
        footer={
          <Typography variant="body2" sx={{ color: colors.inkSoft }}>
            Remembered it?{' '}
            <Typography
              component={Link}
              href="/login"
              variant="body2"
              sx={{ color: 'primary.dark', fontWeight: 600 }}
            >
              Back to sign in
            </Typography>
          </Typography>
        }
      >
        <Alert severity="success">
          If {email.trim()} has an account, a link to choose a new password is on
          its way. The link stops working once it is used.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Forgot password"
      title="Reset your password"
      description="We will email you a link to choose a new one."
      footer={
        <Typography variant="body2" sx={{ color: colors.inkSoft }}>
          Remembered it?{' '}
          <Typography
            component={Link}
            href="/login"
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 600 }}
          >
            Back to sign in
          </Typography>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
        {error && !fieldError('email') ? (
          <Alert severity="error">
            {errorMessage(error, 'Could not send the reset link.')}
          </Alert>
        ) : null}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
            setClientErrors((current) => ({ ...current, email: '' }));
          }}
          errorText={clientErrors.email || fieldError('email')}
          autoComplete="email"
          autoFocus
          required
          slotProps={{ htmlInput: { maxLength: 254 } }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={submitting || !email}
          sx={{ mt: 0.5, borderRadius: `${radii.pill}px` }}
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </Stack>
    </AuthCard>
  );
}

interface ResetLink {
  uid: string;
  token: string;
}

/**
 * Collects the new password for a link opened from an email.
 *
 * The uid and token arrive on the query string. They are read after mount
 * rather than during render, because the page is server rendered and `window`
 * does not exist yet - and `useSearchParams` would force the whole route out of
 * static rendering.
 */
export function ResetPasswordView() {
  const router = useRouter();
  const { colors } = useAppScheme();
  const [link, setLink] = useState<ResetLink | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLink({ uid: params.get('uid') ?? '', token: params.get('token') ?? '' });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

  const confirmError = confirm && password !== confirm ? 'Passwords do not match.' : undefined;
  const validLink = Boolean(link?.uid && link?.token);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!link || !validLink) return;

    const validationErrors: Record<string, string> = {};
    const passwordValidationError = validateNewPassword(password);
    if (passwordValidationError) validationErrors.password = passwordValidationError;
    if (password !== confirm) validationErrors.confirm = 'Passwords do not match.';
    setClientErrors(validationErrors);
    setError(null);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.confirmPasswordReset({
        uid: link.uid,
        token: link.token,
        new_password: password,
      });
      // The login page reads `?reset=1` and reassures the user there.
      router.replace('/login?reset=1');
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  if (link && !validLink) {
    return (
      <AuthCard
        eyebrow="Link problem"
        title="This link is incomplete"
        description="Reset links carry a one-time code, and part of it is missing."
        footer={
          <Typography variant="body2" sx={{ color: colors.inkSoft }}>
            <Typography
              component={Link}
              href="/forgot-password"
              variant="body2"
              sx={{ color: 'primary.dark', fontWeight: 600 }}
            >
              Request a new link
            </Typography>
          </Typography>
        }
      >
        <Alert severity="error">
          Request a fresh reset email and open the newest link.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Almost there"
      title="Choose a new password"
      description="Then you can sign in with it right away."
      footer={
        <Typography variant="body2" sx={{ color: colors.inkSoft }}>
          <Typography
            component={Link}
            href="/forgot-password"
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 600 }}
          >
            Request a new link
          </Typography>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.25} onSubmit={handleSubmit} noValidate>
        {error && !fieldError('token') && !fieldError('new_password') ? (
          <Alert severity="error">{errorMessage(error, 'Could not reset your password.')}</Alert>
        ) : null}
        {fieldError('token') ? (
          <Alert severity="error">{fieldError('token')}</Alert>
        ) : null}
        <PasswordField
          label="New password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError(null);
            setClientErrors((current) => ({ ...current, password: '' }));
          }}
          errorText={clientErrors.password || fieldError('new_password')}
          helperText="At least 8 characters, including a letter and a number."
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(value) => {
            setConfirm(value);
            setClientErrors((current) => ({ ...current, confirm: '' }));
          }}
          errorText={clientErrors.confirm || confirmError}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={submitting || !password || !confirm}
          sx={{ mt: 0.5, borderRadius: `${radii.pill}px` }}
        >
          {submitting ? 'Saving…' : 'Set new password'}
        </Button>
      </Stack>
    </AuthCard>
  );
}
