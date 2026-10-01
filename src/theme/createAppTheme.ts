import type { ColorSystemOptions, CssVarsTheme } from '@mui/material/styles';
import { alpha, extendTheme } from '@mui/material/styles';
import { motion, radii, schemeTokens } from './tokens';
import { buildTypography } from './typography';

export interface ThemeFonts {
  display: string;
  sans: string;
  mono: string;
}

function scheme(name: 'light' | 'dark'): ColorSystemOptions {
  const tokens = schemeTokens[name];
  return {
    palette: tokens.palette,
  };
}

/**
 * Builds the full application theme.
 *
 * Colour is defined once per scheme and emitted as CSS custom properties, which
 * keeps dark mode a single class swap rather than a re-render of every style.
 * Separation is done with hairlines and warm-tinted shadows instead of heavy
 * elevation, and motion is short and overshoot-free.
 */
export function createAppTheme(fonts: ThemeFonts): CssVarsTheme {
  const theme = extendTheme({
    colorSchemes: {
      light: scheme('light'),
      dark: scheme('dark'),
    },
    // Must match the `attribute` on InitColorSchemeScript. The default
    // 'media' selector keys off the OS only, which would silently ignore an
    // explicit light/dark choice made in Settings.
    colorSchemeSelector: 'data-mui-color-scheme',
    defaultColorScheme: 'light',
    shape: { borderRadius: radii.md },
    spacing: 8,
    typography: buildTypography(fonts),
    transitions: {
      duration: {
        shortest: motion.instant,
        shorter: motion.fast,
        short: motion.base,
        standard: motion.base,
        complex: motion.slow,
        enteringScreen: motion.base,
        leavingScreen: motion.fast,
      },
      easing: {
        easeInOut: motion.spring,
        easeOut: motion.spring,
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Referenced through the generated custom properties rather than
          // literal hex, so the document surface follows the active scheme.
          html: {
            backgroundColor: 'var(--mui-palette-background-default)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
          },
          body: {
            backgroundColor: 'var(--mui-palette-background-default)',
            color: 'var(--mui-palette-text-primary)',
            minHeight: '100vh',
          },
          '::selection': {
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-primary-main) 18%, transparent)',
          },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--mui-palette-action-active)',
            borderRadius: radii.pill,
            border: '3px solid transparent',
            backgroundClip: 'content-box',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme: t }) => ({
            backgroundColor: t.palette.background.paper,
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: t.palette.divider,
            borderRadius: radii.lg,
            transition: `border-color ${motion.fast} ${motion.spring}, transform ${motion.fast} ${motion.spring}, box-shadow ${motion.fast} ${motion.spring}`,
          }),
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radii.pill,
            paddingInline: 20,
            minHeight: 40,
            transition: `background-color ${motion.fast} ${motion.spring}, border-color ${motion.fast} ${motion.spring}, color ${motion.fast} ${motion.spring}, transform ${motion.instant} ${motion.spring}`,
          },
          sizeLarge: { minHeight: 48, paddingInline: 26, fontSize: '0.9375rem' },
          sizeSmall: { minHeight: 32, paddingInline: 14, fontSize: '0.8125rem' },
          contained: ({ theme: t }) => ({
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
            '&.MuiButton-colorPrimary:hover': { backgroundColor: t.palette.primary.dark },
            '&:active': { transform: 'scale(0.985)' },
          }),
          outlined: ({ theme: t }) => ({
            borderColor: t.palette.divider,
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: t.palette.primary.main,
              backgroundColor: alpha(t.palette.primary.main, 0.06),
            },
          }),
          text: ({ theme: t }) => ({
            '&:hover': { backgroundColor: alpha(t.palette.primary.main, 0.07) },
          }),
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: radii.sm,
            transition: `background-color ${motion.fast} ${motion.spring}, color ${motion.fast} ${motion.spring}`,
          },
        },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.9375rem',
            color: 'var(--mui-palette-text-primary)',
            '& .MuiInputBase-input::placeholder': {
              color: 'var(--mui-palette-text-disabled)',
              opacity: 1,
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radii.sm,
            backgroundColor: 'var(--mui-palette-background-paper)',
            color: 'var(--mui-palette-text-primary)',
            transition: `background-color ${motion.fast} ${motion.spring}`,
            '& .MuiOutlinedInput-input': {
              color: 'var(--mui-palette-text-primary)',
              WebkitTextFillColor: 'var(--mui-palette-text-primary)',
              '&:-webkit-autofill': {
                WebkitBoxShadow: '0 0 0 100px var(--mui-palette-background-paper) inset',
                WebkitTextFillColor: 'var(--mui-palette-text-primary)',
                caretColor: 'var(--mui-palette-text-primary)',
              },
            },
            '& fieldset': { borderColor: 'var(--mui-palette-divider)', transition: 'border-color 160ms' },
            '&:hover fieldset': { borderColor: 'var(--mui-palette-text-disabled)' },
            '&.Mui-focused:hover fieldset': { borderColor: 'var(--mui-palette-primary-main)' },
            'html[data-mui-color-scheme="dark"] &': { backgroundColor: 'transparent' },
          },
          input: { paddingTop: 13, paddingBottom: 13 },
          notchedOutline: { borderWidth: 1 },
        },
      },

      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            color: 'var(--mui-palette-text-secondary)',
            '&.Mui-focused': { color: 'var(--mui-palette-primary-main)' },
          },
        },
      },

      MuiInputAdornment: {
        styleOverrides: {
          root: ({ theme: t }) => ({ color: t.palette.text.disabled }),
        },
      },

      MuiDialog: {
        styleOverrides: {
          root: {
            '& .MuiDialog-paper': {
              borderRadius: radii.lg,
              backgroundColor: 'var(--mui-palette-background-paper)',
              color: 'var(--mui-palette-text-primary)',
              backgroundImage: 'none',
              border: '1px solid var(--mui-palette-divider)',
            },
          },
          backdrop: () => ({
            backgroundColor: 'color-mix(in srgb, var(--mui-palette-background-default) 72%, transparent)',
            backdropFilter: 'blur(3px)',
            opacity: 1,
          }),
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme: t }) => ({
            backgroundColor: t.palette.background.paper,
            backgroundImage: 'none',
            borderColor: t.palette.divider,
          }),
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 6,
            borderRadius: radii.md,
            backgroundColor: 'var(--mui-palette-background-paper)',
            color: 'var(--mui-palette-text-primary)',
            backgroundImage: 'none',
            border: '1px solid var(--mui-palette-divider)',
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: radii.sm,
            transition: `background-color ${motion.fast} ${motion.spring}`,
            '&.Mui-selected': {
              backgroundColor: alpha(t.palette.primary.main, 0.10),
              '&:hover': { backgroundColor: alpha(t.palette.primary.main, 0.14) },
            },
          }),
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: radii.sm,
            marginInline: 6,
            fontSize: '0.875rem',
            '&.Mui-selected': { backgroundColor: alpha(t.palette.primary.main, 0.10) },
          }),
        },
      },

      MuiChip: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: radii.pill,
            fontWeight: 600,
            fontSize: '0.75rem',
            backgroundColor: alpha(t.palette.primary.main, 0.08),
            color: t.palette.text.primary,
          }),
          sizeSmall: { height: 22, fontSize: '0.6875rem' },
          outlined: ({ theme: t }) => ({
            backgroundColor: 'transparent',
            borderColor: t.palette.divider,
          }),
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme: t }) => ({
            backgroundColor: t.palette.text.primary,
            color: t.palette.background.paper,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: radii.xs,
            padding: '6px 10px',
          }),
          arrow: ({ theme: t }) => ({
            color: t.palette.text.primary,
          }),
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: ({ theme: t }) => ({
            backgroundColor: t.palette.primary.main,
            height: 2,
            borderRadius: radii.pill,
          }),
        },
      },

      MuiTab: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 44,
            color: t.palette.text.secondary,
            '&.Mui-selected': { color: t.palette.text.primary },
          }),
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            borderColor: t.palette.divider,
            color: t.palette.text.secondary,
            '&.Mui-selected': {
              backgroundColor: alpha(t.palette.primary.main, 0.12),
              color: t.palette.primary.dark,
            },
          }),
        },
      },

      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: '#FFFFFF' },
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: ({ theme: t }) => ({ borderColor: t.palette.divider }),
        },
      },

      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: ({ theme: t }) => ({
            backgroundColor: alpha(t.palette.text.primary, 0.07),
            borderRadius: radii.sm,
          }),
        },
      },

      MuiCircularProgress: {
        styleOverrides: {
          root: ({ theme: t }) => ({ color: t.palette.primary.main }),
        },
      },

      MuiSnackbarContent: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: radii.md,
            backgroundColor: t.palette.text.primary,
            color: t.palette.background.paper,
            fontSize: '0.875rem',
            fontWeight: 500,
          }),
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: radii.md, fontSize: '0.875rem' },
        },
      },
    },
  });

  return theme;
}
