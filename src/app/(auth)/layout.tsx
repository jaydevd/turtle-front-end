'use client';

import { BrandLogo } from '@/components/layout/BrandLogo';
import { RedirectIfAuthenticated } from '@/components/layout/RouteGuards';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import Link from 'next/link';

/**
 * Auth screens are a single centred column on warm paper, with the wordmark
 * doubling as the home link back to the marketing surface.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { resolvedMode, toggle } = useThemeMode();

  return (
    <RedirectIfAuthenticated>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          backgroundColor: 'color-mix(in srgb, var(--mui-palette-background-default) 90%, var(--mui-palette-text-primary) 10%)',
          backgroundImage: `radial-gradient(ellipse at 16% 18%, color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent), transparent 44%), radial-gradient(ellipse at 86% 78%, color-mix(in srgb, var(--mui-palette-secondary-main) 10%, transparent), transparent 42%), repeating-linear-gradient(135deg, color-mix(in srgb, var(--mui-palette-text-primary) 0.7%, transparent) 0, color-mix(in srgb, var(--mui-palette-text-primary) 0.7%, transparent) 1px, transparent 1px, transparent 8px)`,
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
          }}
        >
          <Stack
            component={Link}
            href="/"
            aria-label="Habit Tracker home"
            sx={{ borderRadius: 1.25 }}
          >
            <BrandLogo />
          </Stack>

          <Tooltip title={resolvedMode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            <IconButton onClick={toggle} aria-label="Toggle colour scheme" size="small">
              {resolvedMode === 'dark' ? (
                <LightModeOutlined fontSize="small" />
              ) : (
                <DarkModeOutlined fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ display: 'grid', placeItems: 'center', px: 2.5, pb: 8 }}>{children}</Box>
      </Box>
    </RedirectIfAuthenticated>
  );
}
