/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  async redirects() {
    return [
      {
        source: '/board',
        destination: '/analytics',
        permanent: true,
      },
      {
        source: '/metrics',
        destination: '/analytics',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
