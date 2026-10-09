import { InitColorSchemeScript } from '@mui/material';
import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers';

/**
 * Fraunces carries the editorial voice on headings; Inter Tight handles all
 * interface copy. Both are self-hosted by next/font, so there is no layout
 * shift and no third-party request at runtime.
 */
const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  preload: true,
});

const sans = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  preload: true,
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Turtle',
    template: '%s · Turtle',
  },
  description: 'Build consistency, one day at a time.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F5F0' },
    { media: '(prefers-color-scheme: dark)', color: '#121513' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before paint, avoiding a flash of light. */}
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
