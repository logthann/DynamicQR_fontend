/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    serverComponentsExternalPackages: ['@tanstack/react-query'],
  },
};

module.exports = nextConfig;

