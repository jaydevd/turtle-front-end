import type { NextConfig } from 'next';

/**
 * Django runs with DEBUG=False and has no CORS middleware installed, so the
 * browser cannot call it cross-origin. Instead we proxy /api/* through the
 * Next.js server, which makes every request same-origin and keeps the Django
 * host off the client bundle.
 *
 * Set DJANGO_API_URL in .env.local (defaults to the local dev server).
 */
const DJANGO_API_URL = process.env.DJANGO_API_URL ?? 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  /**
   * `/api/*` is proxied to Django, which accepts the trailing slash as optional
   * so no `APPEND_SLASH` redirect can occur mid-chain. The proxy normalizes the
   * path anyway, so suppress Next's own 308 to avoid a pointless extra hop on
   * every API call.
   */
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${DJANGO_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
