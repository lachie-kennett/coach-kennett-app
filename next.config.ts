import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Avatar uploads are resized client-side, but allow headroom for raw uploads.
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
