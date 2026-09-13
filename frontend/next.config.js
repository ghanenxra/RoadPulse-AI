/** @type {import('next').NextConfig} */
const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/reports/:path*',
        destination: `${backendUrl}/reports/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
