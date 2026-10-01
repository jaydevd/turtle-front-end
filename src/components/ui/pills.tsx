'use client';

import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type { HabitStatus } from '@/types/api';

export const statusLabels: Record<HabitStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  PARTIAL: 'Partial',
  MISSED: 'Missed',
  SKIPPED: 'Skipped',
};

const statusTone: Record<HabitStatus, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'info',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  MISSED: 'error',
  SKIPPED: 'default',
};

export interface StatusPillProps {
  status: HabitStatus;
  size?: 'small' | 'medium';
}

export function StatusPill({ status, size = 'small' }: StatusPillProps) {
  const tone = statusTone[status];
  const small = size === 'small';

  return (
    <Box
      component="span"
      sx={(t: Theme) => {
        const base = tone === 'default' ? t.palette.text.secondary : t.palette[tone].main;
        return {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          height: small ? 22 : 28,
          px: small ? 1 : 1.5,
          borderRadius: radii.pill,
          backgroundColor: alpha(base, 0.12),
          color: base,
          flexShrink: 0,
        };
      }}
    >
      <Box
        component="span"
        sx={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
      />
      <Typography
        component="span"
        variant="caption"
        sx={{ fontWeight: 700, fontSize: small ? '0.6875rem' : '0.75rem', lineHeight: 1 }}
      >
        {statusLabels[status]}
      </Typography>
    </Box>
  );
}

export interface TagChipProps {
  name: string;
  count?: number;
  /** Optional per-tag accent, shown as a leading dot. */
  color?: string | null;
  onClick?: () => void;
  active?: boolean;
}

export function TagChip({ name, count, color, onClick, active = false }: TagChipProps) {
  const { colors } = useAppScheme();
  const interactive = typeof onClick === 'function';

  return (
    <Box
      component={interactive ? 'button' : 'span'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={interactive ? active : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.875,
        height: 28,
        px: 1.375,
        borderRadius: radii.pill,
        border: '1px solid',
        borderColor: active ? colors.sage : colors.hairline,
        backgroundColor: active ? colors.primaryWash : 'transparent',
        color: active ? colors.primaryInk : colors.inkSoft,
        cursor: interactive ? 'pointer' : 'default',
        fontFamily: 'inherit',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: `background-color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms, color 160ms`,
        '&:hover': interactive
          ? {
              borderColor: colors.sage,
              backgroundColor: active ? colors.primaryWash : colors.paperRaised,
            }
          : undefined,
        '&:focus-visible': interactive ? { outline: 'none', boxShadow: `0 0 0 3px ${colors.ring}` } : undefined,
      }}
    >
      {color ? (
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
      ) : null}
      {name}
      {typeof count === 'number' ? (
        <Box
          component="span"
          sx={{ color: colors.inkSoft, fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}
        >
          {count}
        </Box>
      ) : null}
    </Box>
  );
}

/** The 3px colour rail down the leading edge of a habit card. */
export function AccentBar({ color, height = '100%' }: { color: string; height?: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 3,
        height,
        borderRadius: radii.pill,
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

/** Small circular swatch used in lists and legends. */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}
