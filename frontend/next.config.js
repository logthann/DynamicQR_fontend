/** @type {import('next').NextConfig} */
const backendApiBase = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''
)
  .replace(/\/api\/v1\/?$/i, '')
  .replace(/\/+$/, '');

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
    if (!backendApiBase) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendApiBase}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
