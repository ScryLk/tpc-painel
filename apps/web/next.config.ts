import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tpc/lib', '@tpc/ui'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
