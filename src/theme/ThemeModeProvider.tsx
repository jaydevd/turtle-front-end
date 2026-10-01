'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'habit-tracker-theme-mode';

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
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const { mode, setMode } = useColorScheme();
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

  const resolvedMode: 'light' | 'dark' = mode === 'dark' ? 'dark' : 'light';

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
