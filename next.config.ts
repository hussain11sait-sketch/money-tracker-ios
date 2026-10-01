import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export',  // <--- Comment this out for now
  images: {
    unoptimized: true,
  },
};

export default nextConfig;