import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Vercel project still has Output Directory = `build` from the old Vite app; Next defaults to `.next`.
  distDir: 'build',
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'narvo.live' }],
        destination: 'https://narvo.news/:path*',
        permanent: true,
      },
      { source: '/bookmarks', destination: '/library', permanent: false },
      { source: '/bookmarks/:path*', destination: '/library', permanent: false },
      { source: '/saved', destination: '/library', permanent: false },
      { source: '/offline', destination: '/library', permanent: false },
      { source: '/voices', destination: '/settings?tab=voice', permanent: false },
      { source: '/profile', destination: '/settings?tab=account', permanent: false },
      { source: '/history', destination: '/insights', permanent: false },
      { source: '/history/:path*', destination: '/insights', permanent: false },
      { source: '/analytics', destination: '/insights', permanent: false },
      { source: '/analytics/:path*', destination: '/insights', permanent: false },
    ];
  },
  // Next 15.5 defaults this to true; it can throw "SegmentViewNode ... not in React Client Manifest" in dev.
  experimental: {
    devtoolSegmentExplorer: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Remote images: in dev, skip the image optimizer so Unsplash etc. load in the browser.
  // Server-side fetch often hits ETIMEDOUT on slow or restricted networks; production keeps optimization.
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.transparenttextures.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
