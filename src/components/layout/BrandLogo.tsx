'use client';

import { useAppScheme } from '@/theme/useAppScheme';
import { Box, Stack, Typography } from '@mui/material';
import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  showName?: boolean;
}

export function BrandLogo({ size = 34, showName = true }: BrandLogoProps) {
  const { mode } = useAppScheme();
  const logoSource = mode === 'dark' ? '/brand/logo-light.png' : '/brand/logo-dark.png';

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
          borderRadius: '5px',
        }}
      >
        <Image
          src={logoSource}
          alt={showName ? '' : 'Habit Tracker'}
          fill
          sizes={`${size}px`}
          style={{ objectFit: 'contain' }}
          priority
        />
      </Box>
      {showName ? (
        <Typography
          component="span"
          sx={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1875rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--mui-palette-text-primary)',
          }}
        >
          Turtle
        </Typography>
      ) : null}
    </Stack>
  );
}
