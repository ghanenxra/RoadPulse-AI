/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/reports/:path*',
        destination: 'http://127.0.0.1:8000/reports/:path*',
      },
    ]
  },
}

module.exports = nextConfig
