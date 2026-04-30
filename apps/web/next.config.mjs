/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:7539/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://localhost:7539/ws/:path*',
      },
    ]
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.tsx',
      },
    },
  },
}

export default nextConfig;
