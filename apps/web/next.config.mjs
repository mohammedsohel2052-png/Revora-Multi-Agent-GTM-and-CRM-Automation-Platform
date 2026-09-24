/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@revora/shared', '@revora/db'],
};

export default nextConfig;
