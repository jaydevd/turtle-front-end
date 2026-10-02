'use client';

import { Field } from '@/components/ui/inputs';
import { Surface } from '@/components/ui/surfaces';
import { errorMessage, isApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import {
    Alert,
    Box,
    Button,
    IconButton,
    InputAdornment,
    Stack,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authenticatedDestination(): string {
  const requested = new URLSearchParams(window.location.search).get('next');
  return requested?.startsWith('/') && !requested.startsWith('//')
    ? requested
    : '/dashboard';
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

function PasswordField({
  label,
  value,
  onChange,
  errorText,
  autoComplete,
  helperText,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  errorText?: string;
  autoComplete?: string;
  helperText?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      errorText={errorText}
      helperText={helperText}
      autoComplete={autoComplete}
      required={required}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? 'Hide password' : 'Show password'}
              >
                {visible ? (
                  <VisibilityOffOutlined fontSize="small" />
                ) : (
                  <VisibilityOutlined fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
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

  const fieldError = (field: string) =>
    isApiError(error) ? error.fieldError(field) : undefined;

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
        {error && !fieldError('email') && !fieldError('password') ? (
          <Alert severity="error">{errorMessage(error, 'Could not sign you in.')}</Alert>
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
