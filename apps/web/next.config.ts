import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const withAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tpc/lib', '@tpc/ui'],
  experimental: {
    typedRoutes: true,
  },
}

export default withAnalyzer(nextConfig)
