import { fileURLToPath } from 'node:url';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: 'standalone',            // apps/web/Dockerfile copies .next/standalone
  outputFileTracingRoot: root,     // pnpm monorepo: trace node_modules from the workspace root
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        // CSP: add a nonce-based policy before public launch (see docs/security-review.md)
      ],
    }];
  },
  transpilePackages: ['@auction/shared'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }] },
};

export default withNextIntl(nextConfig);
