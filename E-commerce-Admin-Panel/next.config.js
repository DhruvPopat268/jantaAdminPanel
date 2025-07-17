// next.config.js (or next.config.mjs if you're using .mjs)
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const baseConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  },
};

// Apply the PWA wrapper
const nextConfig = withPWA(baseConfig);

// Add experimental config **after** wrapping
export default {
  ...nextConfig,
  experimental: {
    middlewarePrefetch: 'flexible', // ✅ must be "flexible" or "strict", not `true`
  },
};
