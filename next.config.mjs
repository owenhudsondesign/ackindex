import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Enable instrumentation for Sentry
  experimental: {
    instrumentationHook: true,
  },

  // Enable source maps for production (required for GlitchTip source map uploads)
  productionBrowserSourceMaps: true,
};

// Sentry configuration options for GlitchTip
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project names
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // GlitchTip server URL (defaults to Sentry, override for GlitchTip)
  sentryUrl: process.env.SENTRY_URL || 'https://app.glitchtip.com',

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
};

// Make sure to wrap your config with withSentryConfig
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
