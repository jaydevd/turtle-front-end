'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from '@mui/material/styles';
import { useResolvedMode } from './useAppScheme';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'habit-tracker-theme-mode';
const DEFAULT_MODE: ThemeMode = 'dark';

interface ThemeModeContextValue {
  /** What the user picked, including `system`. */
  preference: ThemeMode;
  /** What is actually rendered once `system` is resolved. */
  resolvedMode: 'light' | 'dark';
  setPreference: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readStoredPreference(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : DEFAULT_MODE;
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const { setMode } = useColorScheme();
  // The stored choice is read lazily and never reaches the markup, so the
  // server render and the first client render stay identical. MUI is told the
  // preference in the effect below, after hydration.
  const [preference, setPreferenceState] = useState<ThemeMode>(readStoredPreference);

  useEffect(() => {
    setMode(preference);
  }, [preference, setMode]);

  const setPreference = useCallback((next: ThemeMode) => {
    setPreferenceState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // Derived from the resolved scheme rather than the preference, so `system`
  // reports the same light/dark the stylesheet is actually using.
  const resolvedMode = useResolvedMode();

  const toggle = useCallback(() => {
    setPreference(resolvedMode === 'dark' ? 'light' : 'dark');
  }, [resolvedMode, setPreference]);

  const value = useMemo(
    () => ({ preference, resolvedMode, setPreference, toggle }),
    [preference, resolvedMode, setPreference, toggle],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used inside ThemeModeProvider');
  }
  return context;
}
