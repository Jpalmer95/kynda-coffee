import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
