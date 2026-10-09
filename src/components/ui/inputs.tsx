'use client';

import {
  Box,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SelectChangeEvent, TextFieldProps } from '@mui/material';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { habitIconKeys, habitSwatches, radii, weekdayLabels } from '@/theme/tokens';
import type { HabitIconKey } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import { tabularNums } from '@/theme/typography';
import { iconMap } from './HabitIcon';
import { useState } from 'react';
import type { Weekday } from '@/types/api';

export interface FieldProps extends Omit<TextFieldProps, 'label' | 'helperText'> {
  label: string;
  /** Field-level message from the API's 411 response. */
  errorText?: string;
  helperText?: React.ReactNode;
}

/** Text input with consistent label placement, spacing and message treatment. */
export function Field({ label, errorText, helperText, sx, ...rest }: FieldProps) {
  const message = errorText ?? helperText;
  return (
    <TextField
      label={label}
      fullWidth
      size="small"
      error={Boolean(errorText)}
      helperText={message}
      slotProps={{
        formHelperText: { sx: { mx: 0.25, mt: 0.75, fontSize: '0.75rem' } },
      }}
      {...rest}
      sx={{ '& .MuiInputLabel-root': { fontSize: '0.875rem' }, ...sx }}
    />
  );
}

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  errorText?: string;
  autoComplete?: string;
  helperText?: React.ReactNode;
  /** Pass false only where the field is genuinely optional. */
  required?: boolean;
}

/**
 * A password input with a visibility toggle. Typed against a plain string rather
 * than a change event so callers hold no input state of their own beyond the
 * string they need to submit.
 */
export function PasswordField({
  label,
  value,
  onChange,
  errorText,
  autoComplete,
  helperText,
  required = true,
}: PasswordFieldProps) {
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

/**
 * Composed from `Select` rather than `TextField select`, because TextField's
 * prop union types its `onChange` as the plain-input handler, which conflicts
 * with the Select change signature.
 */
export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  errorText?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  name?: string;
}

/** Native select styled to match `Field`, for small enums and option lists. */
export function SelectField({
  label,
  value,
  onChange,
  errorText,
  helperText,
  disabled,
  name,
  children,
}: SelectFieldProps & { children: React.ReactNode }) {
  const message = errorText ?? helperText;

  return (
    <FormControl fullWidth size="small" error={Boolean(errorText)} disabled={disabled}>
      <InputLabel id={`select-${name ?? label}`}>{label}</InputLabel>
      <Select
        labelId={`select-${name ?? label}`}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        label={label}
      >
        {children}
      </Select>
      {message ? (
        <FormHelperText sx={{ mx: 0.25, mt: 0.75, fontSize: '0.75rem' }}>
          {message}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'small',
  fullWidth = false,
  ariaLabel,
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  ariaLabel?: string;
}) {
  const { colors, shadows } = useAppScheme();
  return (
    <ToggleButtonGroup
      exclusive
      size={size}
      value={value}
      onChange={(_event, next: T | null) => {
        if (next !== null) onChange(next);
      }}
      aria-label={ariaLabel}
      sx={{
        width: fullWidth ? '100%' : 'auto',
        p: 0.25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: radii.pill,
        backgroundColor: 'background.default',
        '& .MuiToggleButton-root': {
          borderRadius: `${radii.pill}px !important`,
          px: fullWidth ? 1 : 2,
          flex: fullWidth ? 1 : 'initial',
          borderColor: 'transparent',
          color: colors.inkSoft,
          '&.Mui-selected': {
            backgroundColor: 'background.paper',
            color: colors.primaryInk,
            boxShadow: shadows.card,
          },
          '&.Mui-selected:hover': { backgroundColor: 'background.paper', color: colors.primaryInk },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value} aria-label={option.label}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/* ------------------------------------------------------------------ */
/* Weekday picker                                                      */
/* ------------------------------------------------------------------ */

export function WeekdayToggle({
  value,
  onChange,
}: {
  value: Weekday[];
  onChange: (next: Weekday[]) => void;
}) {
  const { colors } = useAppScheme();

  const toggle = (day: Weekday) => {
    onChange(
      value.includes(day) ? value.filter((item) => item !== day) : [...value, day].sort(),
    );
  };

  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {weekdayLabels.map((label, index) => {
        const selected = value.includes(index as Weekday);
        return (
          <Box
            key={label}
            component="button"
            type="button"
            onClick={() => toggle(index as Weekday)}
            aria-pressed={selected}
            sx={{
              width: 44,
              height: 40,
              borderRadius: radii.sm,
              border: '1px solid',
              borderColor: selected ? colors.sage : colors.hairline,
              backgroundColor: selected ? colors.primaryWash : 'transparent',
              color: selected ? colors.primaryInk : colors.inkSoft,
              fontFamily: 'inherit',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: `background-color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms, color 160ms`,
              '&:hover': {
                borderColor: colors.sage,
                backgroundColor: selected ? colors.primaryWash : colors.paperRaised,
              },
              '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${colors.ring}` },
            }}
          >
            {label}
          </Box>
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Accent colour picker                                                */
/* ------------------------------------------------------------------ */

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { mode, colors } = useAppScheme();
  const swatches = habitSwatches.map((swatch) => swatch[mode]);

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {swatches.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <Box
            key={color}
            component="button"
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Use accent ${color}`}
            aria-pressed={selected}
            sx={{
              width: 34,
              height: 34,
              borderRadius: radii.pill,
              backgroundColor: color,
              border: '2px solid',
              borderColor: selected ? colors.ink : 'transparent',
              cursor: 'pointer',
              padding: 0,
              transition: `transform 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 140ms`,
              boxShadow: selected
                ? `0 0 0 3px ${colors.paper}, 0 0 0 4px ${alpha(color, 0.5)}`
                : 'none',
              '&:hover': { transform: 'scale(1.08)' },
              '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${colors.ring}` },
            }}
          />
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Icon picker                                                         */
/* ------------------------------------------------------------------ */

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: HabitIconKey) => void;
}) {
  const { colors } = useAppScheme();

  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {habitIconKeys.map((key) => {
        const Icon = iconMap[key];
        const selected = (value ?? key) === key;
        return (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            aria-pressed={selected}
            sx={{
              width: 40,
              height: 40,
              borderRadius: radii.sm,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid',
              borderColor: selected ? colors.sage : colors.hairline,
              backgroundColor: selected ? colors.primaryWash : 'transparent',
              color: selected ? colors.primaryInk : colors.inkSoft,
              cursor: 'pointer',
              transition: `background-color 160ms, border-color 160ms, color 160ms`,
              '&:hover': { borderColor: colors.sage, color: colors.sage },
              '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${colors.ring}` },
            }}
          >
            <Icon sx={{ fontSize: 19 }} />
          </Box>
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Small numeric stepper                                               */
/* ------------------------------------------------------------------ */

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const { colors } = useAppScheme();

  const buttonSx = {
    width: 34,
    height: 34,
    borderRadius: radii.xs,
    border: '1px solid',
    borderColor: colors.hairline,
    backgroundColor: 'transparent',
    color: colors.ink,
    fontSize: '1.05rem',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    '&:hover:not(:disabled)': { borderColor: colors.sage, color: colors.sage },
    '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
  } as const;

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        component="button"
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        sx={buttonSx}
      >
        &minus;
      </Box>
      <Typography
        variant="h4"
        sx={{ minWidth: 34, textAlign: 'center', ...tabularNums }}
      >
        {value}
      </Typography>
      <Box
        component="button"
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        sx={buttonSx}
      >
        +
      </Box>
    </Stack>
  );
}

/** Options for the tag select, keeping "no tags yet" states obvious. */
export function TagOption({ name, count }: { name: string; count?: number }) {
  return (
    <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
      <Typography variant="body2" sx={{ flex: 1 }}>
        {name}
      </Typography>
      {typeof count === 'number' ? (
        <Typography variant="caption" color="text.secondary" sx={{ ...tabularNums }}>
          {count}
        </Typography>
      ) : null}
    </Stack>
  );
}
