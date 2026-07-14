/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Images are now served via internal API routes — no remote patterns needed.
  images: {
    remotePatterns: [],
    // WebP encodes ~5-10x faster than AVIF; only images that still go
    // through /_next/image use this (the gallery uses a custom loader).
    formats: ["image/webp"],
    localPatterns: [
      {
        pathname: "/api/images/**",
      },
    ],
  },
};

export default nextConfig;
