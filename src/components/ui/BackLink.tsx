'use client';

import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { Button } from '@mui/material';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface BackLinkProps {
  href: string;
  children: ReactNode;
}

/**
 * A page's back affordance. Small buttons carry `paddingInline: 14`, which
 * leaves the arrow indented from the content edge; a matching negative margin
 * cancels it so the icon sits flush with the line every row below starts on,
 * while the hover pill keeps its padding.
 */
export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Button
      component={Link}
      href={href}
      color="inherit"
      size="small"
      startIcon={<ArrowBackRounded />}
      sx={{ mb: 2, ml: '-14px' }}
    >
      {children}
    </Button>
  );
}
