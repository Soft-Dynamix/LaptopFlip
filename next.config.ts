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
    "preview-chat-8f11e6df-88f9-41c9-a47a-10211e137ee7.space.z.ai",
  ],
};

export default nextConfig;
