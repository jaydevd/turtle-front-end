/**
 * Design tokens for the Habit Tracker interface.
 *
 * The direction is "calm editorial": warm bone paper, deep forest-ink text,
 * sage primary and terracotta accent. Contrast pairs below were chosen to stay
 * legible in both schemes rather than being mechanically lightened or darkened.
 */

export type ColorSchemeName = 'light' | 'dark';

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const motion = {
  instant: 110,
  fast: 160,
  base: 220,
  slow: 320,
  /** Overshoot-free spring used for taps and check-ins. */
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const layout = {
  sidebarWidth: 264,
  sidebarCollapsedWidth: 76,
  contentMaxWidth: 1240,
} as const;

/**
 * Curated accent swatches offered when creating a habit. Mid-tone values that
 * hold up as an accent bar against both bone and charcoal paper. The chosen
 * value is stored on the habit's `color` field as a hex string.
 */
export const habitSwatches = [
  { name: 'Sage', light: '#4F8A6E', dark: '#79B396' },
  { name: 'Terracotta', light: '#C4784A', dark: '#E0A276' },
  { name: 'Indigo', light: '#5A6FA8', dark: '#93A3D8' },
  { name: 'Plum', light: '#8A5A86', dark: '#BC8EB8' },
  { name: 'Amber', light: '#B8873A', dark: '#DDB164' },
  { name: 'Teal', light: '#2F8080', dark: '#66B3B3' },
  { name: 'Clay', light: '#B45C4E', dark: '#DC9084' },
  { name: 'Moss', light: '#6E7F3F', dark: '#A3B473' },
] as const;

/** Icon keys accepted by the `icon` field on a habit. */
export const habitIconKeys = [
  'droplet',
  'run',
  'book',
  'meditate',
  'moon',
  'leaf',
  'sun',
  'pen',
  'music',
  'code',
  'heart',
  'cup',
] as const;

export type HabitIconKey = (typeof habitIconKeys)[number];

export const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const weekdayLongLabels = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** Offered as one-click chips on the empty tags screen. */
export const starterTags = [
  'Health',
  'Focus',
  'Fitness',
  'Mindfulness',
  'Learning',
  'Nutrition',
] as const;

export interface AppColors {
  canvas: string;
  paper: string;
  paperRaised: string;
  paperSunken: string;
  ink: string;
  inkSoft: string;
  hairline: string;
  hairlineStrong: string;
  ring: string;
  overlay: string;
  primaryInk: string;
  primaryWash: string;
  sage: string;
  terracotta: string;
  terracottaWash: string;
}

interface SchemeTokens {
  palette: {
    background: { default: string; paper: string };
    primary: { main: string; light: string; dark: string; contrastText: string };
    secondary: { main: string; light: string; dark: string; contrastText: string };
    text: { primary: string; secondary: string; disabled: string };
    divider: string;
    success: { main: string; light: string; dark: string };
    warning: { main: string; light: string; dark: string };
    error: { main: string; light: string; dark: string };
    info: { main: string; light: string; dark: string };
    action: { active: string; selected: string; hover: string };
  };
  colors: AppColors;
  shadows: {
    card: string;
    raised: string;
    overlay: string;
    focus: string;
  };
}

export const schemeTokens: Record<ColorSchemeName, SchemeTokens> = {
  light: {
    palette: {
      background: { default: '#F7F5F0', paper: '#FFFDFA' },
      primary: {
        main: '#386A5A',
        light: '#5C8F7D',
        dark: '#2C5448',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#C4784A',
        light: '#D89A70',
        dark: '#A45C33',
        contrastText: '#FFFFFF',
      },
      text: {
        primary: '#1C241F',
        secondary: '#5A665D',
        disabled: '#9AA39B',
      },
      divider: 'rgba(28, 36, 31, 0.10)',
      success: { main: '#3F7D5C', light: '#63A47E', dark: '#2F6349' },
      warning: { main: '#B8862F', light: '#D0A55B', dark: '#946B23' },
      error: { main: '#B4553F', light: '#C97A66', dark: '#8F4231' },
      info: { main: '#3C6E8F', light: '#6295B3', dark: '#2E5872' },
      action: {
        active: 'rgba(28, 36, 31, 0.06)',
        selected: 'rgba(56, 106, 90, 0.10)',
        hover: 'rgba(28, 36, 31, 0.04)',
      },
    },
    colors: {
      canvas: '#F7F5F0',
      paper: '#FFFDFA',
      paperRaised: '#F1EEE7',
      paperSunken: '#EFEBE1',
      ink: '#1C241F',
      inkSoft: '#5A665D',
      hairline: 'rgba(28, 36, 31, 0.10)',
      hairlineStrong: 'rgba(28, 36, 31, 0.18)',
      ring: 'rgba(56, 106, 90, 0.40)',
      overlay: 'rgba(24, 30, 26, 0.44)',
      primaryInk: '#2C5448',
      primaryWash: 'rgba(56, 106, 90, 0.08)',
      sage: '#386A5A',
      terracotta: '#C4784A',
      terracottaWash: 'rgba(196, 120, 74, 0.10)',
    },
    shadows: {
      card: '0 1px 2px rgba(28, 36, 31, 0.04)',
      raised: '0 4px 16px -4px rgba(28, 36, 31, 0.10)',
      overlay: '0 24px 48px -12px rgba(28, 36, 31, 0.22)',
      focus: '0 0 0 4px rgba(56, 106, 90, 0.16)',
    },
  },
  dark: {
    palette: {
      background: { default: '#121513', paper: '#1A1E1B' },
      primary: {
        main: '#6FA894',
        light: '#8FC4B1',
        dark: '#4E8574',
        contrastText: '#0F1512',
      },
      secondary: {
        main: '#E09A6A',
        light: '#EFB48B',
        dark: '#C97F4E',
        contrastText: '#1A120C',
      },
      text: {
        primary: '#EDEAE2',
        secondary: '#A2ADA4',
        disabled: '#6B756D',
      },
      divider: 'rgba(237, 234, 226, 0.12)',
      success: { main: '#6FAE86', light: '#94C9A6', dark: '#4E8562' },
      warning: { main: '#D9A94A', light: '#E8C57E', dark: '#B08532' },
      error: { main: '#D98470', light: '#E7A897', dark: '#B36150' },
      info: { main: '#6FA8CE', light: '#96C2DF', dark: '#4E809F' },
      action: {
        active: 'rgba(237, 234, 226, 0.08)',
        selected: 'rgba(111, 168, 148, 0.16)',
        hover: 'rgba(237, 234, 226, 0.05)',
      },
    },
    colors: {
      canvas: '#121513',
      paper: '#1A1E1B',
      paperRaised: '#222724',
      paperSunken: '#0E110F',
      ink: '#EDEAE2',
      inkSoft: '#A2ADA4',
      hairline: 'rgba(237, 234, 226, 0.12)',
      hairlineStrong: 'rgba(237, 234, 226, 0.22)',
      ring: 'rgba(111, 168, 148, 0.45)',
      overlay: 'rgba(4, 6, 5, 0.66)',
      primaryInk: '#8FC4B1',
      primaryWash: 'rgba(111, 168, 148, 0.12)',
      sage: '#6FA894',
      terracotta: '#E09A6A',
      terracottaWash: 'rgba(224, 154, 106, 0.14)',
    },
    shadows: {
      card: '0 1px 2px rgba(0, 0, 0, 0.32)',
      raised: '0 6px 20px -6px rgba(0, 0, 0, 0.48)',
      overlay: '0 28px 56px -16px rgba(0, 0, 0, 0.66)',
      focus: '0 0 0 4px rgba(111, 168, 148, 0.20)',
    },
  },
};

/** Maps a `Status` value from the API to its semantic colour slot. */
export const statusColorToken = {
  ACTIVE: 'info',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  MISSED: 'error',
  SKIPPED: 'text',
} as const;
