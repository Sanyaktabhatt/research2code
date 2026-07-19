import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    dirs: ["src"],
  },
  webpack: (config) => {
    // Monaco Editor loads its language workers via dynamic import; keep them
    // out of the main bundle graph analysis.
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
