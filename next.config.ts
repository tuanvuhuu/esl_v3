import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // firebase-admin dùng module Node (gRPC, google-auth): để Node nạp trực tiếp, không đóng gói
  serverExternalPackages: ["firebase-admin"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
