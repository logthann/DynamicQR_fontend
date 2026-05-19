/** @type {import('next').NextConfig} */
const backendApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
