'use client';

import { useMemo } from 'react';
import { useColorScheme } from '@mui/material/styles';
import {
  DEFAULT_SCHEME,
  habitSwatches,
  schemeTokens,
  type AppColors,
  type ColorSchemeName,
} from './tokens';

export interface AppShadows {
  card: string;
  raised: string;
  overlay: string;
  focus: string;
}

export interface AppScheme {
  mode: ColorSchemeName;
  colors: AppColors;
  shadows: AppShadows;
  /**
   * Resolves a habit's stored accent to the value that reads correctly on the
   * current surface. Habits persist a single hex, so the swatch palette keeps
   * a light and dark variant for each colour.
   */
  accentFor: (color?: string | null) => string;
}

/**
 * Maps a stored hex back to its swatch so the scheme-appropriate variant can be
 * picked. Hex is normalised to lowercase because the API may return it in any
 * case. Values outside the curated palette are passed through untouched.
 */
const swatchByHex = new Map<string, (typeof habitSwatches)[number]>(
  habitSwatches.flatMap((swatch) => [
    [swatch.light.toLowerCase(), swatch] as const,
    [swatch.dark.toLowerCase(), swatch] as const,
  ]),
);

/**
 * The scheme actually painted on screen. `useColorScheme().mode` reports the
 * user's *preference* and can still read `'system'` after the OS preference has
 * been resolved, so it must not be used on its own. `colorScheme` is the
 * resolved name MUI uses for the stylesheet; the `systemMode` fallback covers
 * the first hydration pass before that value lands.
 */
export function useResolvedMode(): ColorSchemeName {
  const { mode, systemMode, colorScheme } = useColorScheme();
  if (colorScheme === 'light' || colorScheme === 'dark') return colorScheme;
  if (mode === 'light' || mode === 'dark') return mode;
  if (mode === 'system' && (systemMode === 'light' || systemMode === 'dark')) {
    return systemMode;
  }
  return DEFAULT_SCHEME;
}

/**
 * Semantic tokens that sit outside the MUI palette (canvas, hairlines, warm
 * shadows). Reading them through the hook keeps every consumer automatically
 * correct in both schemes.
 */
export function useAppScheme(): AppScheme {
  const resolved = useResolvedMode();
  const tokens = schemeTokens[resolved];

  return useMemo<AppScheme>(
    () => ({
      mode: resolved,
      colors: tokens.colors,
      shadows: tokens.shadows,
      accentFor: (color) => {
        if (!color) return habitSwatches[0][resolved];
        const swatch = swatchByHex.get(color.toLowerCase());
        // A custom hex has no curated variant, so honour the stored value.
        return swatch ? swatch[resolved] : color;
      },
    }),
    [resolved, tokens],
  );
}
