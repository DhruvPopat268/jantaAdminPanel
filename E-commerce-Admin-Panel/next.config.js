// next.config.mjs
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const baseConfig = {
  experimental: {
    middlewarePrefetch: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

const nextConfig = withPWA({
  ...baseConfig,
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  },
});

export default nextConfig;
