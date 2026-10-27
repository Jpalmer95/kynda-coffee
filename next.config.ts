import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Baseline security headers applied to every response.
// CSP is intentionally limited to directives that cannot break the
// Square/Stripe/PostHog/Sentry bundles (no script-src / style-src).
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "images.printful.com" },
      { protocol: "https", hostname: "images.squareup.com" },
      { protocol: "https", hostname: "*.squarecdn.com" },
      { protocol: "https", hostname: "kyndacoffee.com" },
      { protocol: "https", hostname: "items-images-production.s3.us-west-2.amazonaws.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

// Only wrap with Sentry config when DSN is configured.
// This prevents build errors in CI/local when Sentry isn't set up.
const sentryConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      autoInstrumentServerFunctions: true,
      // Only upload source maps when auth token is available
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },
    })
  : nextConfig;

export default sentryConfig;
