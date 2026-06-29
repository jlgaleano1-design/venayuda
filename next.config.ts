import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/.git/**",
          "**/.next/**",
          "**/.agents/**",
          "**/.codex/**",
          "**/node_modules/**",
        ],
      };
    }

    return config;
  },
};

export default nextConfig;
