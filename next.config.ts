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
      { protocol: "https", hostname: "items-images-production.s3.us-west-2.amazonaws.com" }, // Square fallback bucket
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
