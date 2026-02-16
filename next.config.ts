import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/heat-atlas',
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
