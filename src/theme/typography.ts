import type { TypographyVariantsOptions } from '@mui/material/styles';

/**
 * Two families do all the work: Fraunces for editorial display type and
 * Inter Tight for interface copy. Display sizes tighten their tracking as they
 * grow; small caps labels widen it. Numerals are tabular everywhere so figures
 * in the stat tiles do not jitter as they change.
 */
export function buildTypography(fonts: {
  display: string;
  sans: string;
  mono: string;
}): TypographyVariantsOptions {
  return {
    fontFamily: fonts.sans,
    htmlFontSize: 16,
    fontSize: 15,
    h1: {
      fontFamily: fonts.display,
      fontSize: 'clamp(2.1rem, 1.4rem + 2.4vw, 3.1rem)',
      lineHeight: 1.08,
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontFamily: fonts.display,
      fontSize: 'clamp(1.6rem, 1.3rem + 1.1vw, 2.1rem)',
      lineHeight: 1.16,
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: fonts.display,
      fontSize: '1.45rem',
      lineHeight: 1.24,
      fontWeight: 600,
      letterSpacing: '-0.014em',
    },
    h4: {
      fontFamily: fonts.sans,
      fontSize: '1.125rem',
      lineHeight: 1.36,
      fontWeight: 600,
      letterSpacing: '-0.008em',
    },
    h5: {
      fontFamily: fonts.sans,
      fontSize: '1rem',
      lineHeight: 1.44,
      fontWeight: 600,
    },
    h6: {
      fontFamily: fonts.sans,
      fontSize: '0.9375rem',
      lineHeight: 1.46,
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: fonts.sans,
      fontSize: '0.9375rem',
      lineHeight: 1.55,
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: fonts.sans,
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    body1: {
      fontFamily: fonts.sans,
      fontSize: '0.9375rem',
      lineHeight: 1.62,
      letterSpacing: '0em',
    },
    body2: {
      fontFamily: fonts.sans,
      fontSize: '0.8438rem',
      lineHeight: 1.6,
      letterSpacing: '0em',
    },
    caption: {
      fontFamily: fonts.sans,
      fontSize: '0.7812rem',
      lineHeight: 1.5,
      letterSpacing: '0.004em',
    },
    overline: {
      fontFamily: fonts.sans,
      fontSize: '0.6875rem',
      lineHeight: 1.6,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: fonts.sans,
      fontWeight: 600,
      fontSize: '0.875rem',
      lineHeight: 1.4,
      letterSpacing: '0.004em',
      textTransform: 'none',
    },
  };
}

/** Shared numeric styling for stat figures, day cells and counters. */
export const tabularNums = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
} as const;
