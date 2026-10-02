'use client';

import { radii } from '@/theme/tokens';
import { tabularNums } from '@/theme/typography';
import { useAppScheme } from '@/theme/useAppScheme';
import type { SvgIconComponent } from '@mui/icons-material';
import AddRounded from '@mui/icons-material/AddRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { defaultIconKey, iconMap, isValidIcon } from './HabitIcon';

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export interface SurfaceProps {
  children: React.ReactNode;
  /** Removes the inner padding, for tables and lists that manage their own. */
  flush?: boolean;
  sx?: Record<string, unknown>;
}

export function Surface({ children, flush = false, sx }: SurfaceProps) {
  const { shadows, mode } = useAppScheme();
  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${radii.md}px`,
        boxShadow: mode === 'light' ? shadows.card : 'none',
        ...(flush ? {} : { p: { xs: 2.25, md: 3 } }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export interface SectionProps {
  index?: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function Section({ index, title, description, children, action }: SectionProps) {
  return (
    <Surface>
      <Stack direction="row" spacing={2} sx={{ mb: 2.5, alignItems: 'flex-start' }}>
        {typeof index === 'number' ? (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: radii.xs,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              flexShrink: 0,
              fontSize: '0.75rem',
              fontWeight: 700,
              ...tabularNums,
            }}
          >
            {index}
          </Box>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ letterSpacing: '-0.012em' }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Surface>
  );
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{
        mb: { xs: 3, md: 4 },
        alignItems: { xs: 'stretch', md: 'flex-end' },
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {eyebrow ? (
          <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 0.75 }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h1" sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
        {description ? (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 620 }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            minWidth: 0,
            maxWidth: '100%',
            flexShrink: 1,
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            rowGap: 1,
          }}
        >
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: SvgIconComponent;
  accent?: string;
  compactValue?: boolean;
}

export function StatTile({ label, value, hint, icon: Icon, accent, compactValue = false }: StatTileProps) {
  const { colors } = useAppScheme();
  return (
    <Surface sx={{ p: 2.5, height: '100%', minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.75, alignItems: 'center' }}>
        {Icon ? (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: radii.xs,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: alpha(accent ?? colors.sage, 0.12),
              color: accent ?? colors.sage,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 15 }} />
          </Box>
        ) : null}
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        variant="h2"
        sx={{
          fontSize: compactValue ? { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' } : '2.1rem',
          lineHeight: compactValue ? 1.15 : 1.05,
          color: 'text.primary',
          ...(compactValue ? { overflowWrap: 'anywhere' } : {}),
          ...tabularNums,
        }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
          {hint}
        </Typography>
      ) : null}
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Empty and error states                                              */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  icon?: SvgIconComponent;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  const { colors } = useAppScheme();
  return (
    <Stack
      spacing={1.75}
      sx={{
        py: compact ? 5 : 8,
        px: 2,
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {Icon ? (
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: radii.pill,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: colors.primaryWash,
            color: colors.sage,
            border: `1px solid ${alpha(colors.sage, 0.2)}`,
          }}
        >
          <Icon sx={{ fontSize: 24 }} />
        </Box>
      ) : null}
      <Box sx={{ maxWidth: 400 }}>
        <Typography variant="h4">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {description}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Could not load this',
  message,
  onRetry,
}: ErrorStateProps) {
  const { colors } = useAppScheme();
  return (
    <Stack spacing={1.75} sx={{ py: 6, px: 2, alignItems: 'center', textAlign: 'center' }}>
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: radii.pill,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: alpha('#B4553F', 0.12),
          color: '#B4553F',
        }}
      >
        <ErrorOutlineRounded sx={{ fontSize: 24 }} />
      </Box>
      <Box sx={{ maxWidth: 420 }}>
        <Typography variant="h4">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {message}
        </Typography>
      </Box>
      {onRetry ? (
        <Typography
          component="button"
          type="button"
          onClick={onRetry}
          variant="button"
          sx={{
            border: `1px solid ${colors.hairlineStrong}`,
            borderRadius: radii.pill,
            px: 2.5,
            py: 1,
            background: 'transparent',
            cursor: 'pointer',
            '&:hover': { borderColor: colors.sage },
          }}
        >
          Try again
        </Typography>
      ) : null}
    </Stack>
  );
}

/** Inline empty state for a single list row region. */
export function InlineEmpty({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <Stack spacing={1.5} sx={{ py: 4, px: 2, alignItems: 'center', textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {action ?? (
        <AddRounded sx={{ fontSize: 18, color: 'text.disabled' }} />
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export function StatTileSkeleton() {
  return (
    <Surface sx={{ p: 2.5 }}>
      <Skeleton width={64} height={12} />
      <Skeleton width={88} height={34} sx={{ mt: 1.25 }} />
      <Skeleton width={110} height={11} sx={{ mt: 1 }} />
    </Surface>
  );
}

export function HabitCardSkeleton() {
  return (
    <Surface>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="62%" height={17} />
          <Skeleton width="42%" height={12} sx={{ mt: 0.75 }} />
        </Box>
      </Stack>
      <Skeleton width="100%" height={12} sx={{ mt: 2 }} />
      <Skeleton width="84%" height={12} sx={{ mt: 0.75 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 2.25 }}>
        <Skeleton width={72} height={22} sx={{ borderRadius: radii.pill }} />
        <Skeleton width={88} height={22} sx={{ borderRadius: radii.pill }} />
      </Stack>
    </Surface>
  );
}

export function RowSkeleton({ width = '100%' }: { width?: string }) {
  return <Skeleton width={width} height={14} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: rows }, (_, index) => (
        <Surface key={index} sx={{ py: 1.75, px: 2.25 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Box sx={{ flex: 1 }}>
              <RowSkeleton width="38%" />
            </Box>
            <Skeleton width={64} height={22} sx={{ borderRadius: radii.pill }} />
          </Stack>
        </Surface>
      ))}
    </Stack>
  );
}

/** Label/value row for detail and settings panels. */
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/** Circular icon tile used on habit rows and cards. */
export function HabitIconTile({
  icon,
  color,
  size = 40,
}: {
  icon: string | null;
  color: string;
  size?: number;
}) {
  const Icon = icon && isValidIcon(icon) ? iconMap[icon] : iconMap[defaultIconKey];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: radii.sm,
        display: 'grid',
        placeItems: 'center',
        backgroundColor: alpha(color, 0.14),
        color,
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: size * 0.5 }} />
    </Box>
  );
}
