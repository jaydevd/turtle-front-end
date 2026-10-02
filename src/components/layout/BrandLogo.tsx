'use client';

import { useAppScheme } from '@/theme/useAppScheme';
import { Box, Stack, Typography } from '@mui/material';
import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  showName?: boolean;
  darkModeShadow?: boolean;
}

export function BrandLogo({ size = 40, showName = true, darkModeShadow = false }: BrandLogoProps) {
  const { mode } = useAppScheme();
  const logoSource = mode === 'dark' ? '/brand/logo.png' : '/brand/logo.png';

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        component="span"
        sx={{
          position: 'relative',
          display: 'inline-flex',
          width: size,
          height: size,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: '6px'
        }}
      >
        <Image
          src={logoSource}
          alt={showName ? '' : 'Habit Tracker'}
          fill
          sizes={`${size}px`}
          style={{
            objectFit: 'contain',
            filter:
              darkModeShadow && mode === 'dark'
                ? 'drop-shadow(0 0 2px rgba(255, 254, 254, 0.74))'
                : 'none',
          }}
          priority
        />
      </Box>
      {showName ? (
        <Typography
          component="span"
          sx={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            letterSpacing: '-0.03rem',
            fontWeight: 600,
            color: 'var(--mui-palette-text-primary)',
          }}
        >
          turtle
        </Typography>
      ) : null}
    </Stack>
  );
}
