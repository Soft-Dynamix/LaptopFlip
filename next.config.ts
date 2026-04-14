import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-36749487-ecb6-4776-abf7-b4880976b8ea.space.z.ai",
  ],
};

export default nextConfig;
