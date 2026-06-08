import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old route lived at /pixelify; keep bookmarks + any inbound
      // links working by 301-ing to the SEO-friendly URL.
      {
        source: "/pixelify",
        destination: "/photo-to-pixel-art",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
