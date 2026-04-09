/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
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
