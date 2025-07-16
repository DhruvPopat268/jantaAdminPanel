/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig