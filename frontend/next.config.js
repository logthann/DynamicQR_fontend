/** @type {import('next').NextConfig} */
const backendApiBase = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendApiBase}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

