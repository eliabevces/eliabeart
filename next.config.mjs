/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Images are now served via internal API routes — no remote patterns needed.
  images: {
    remotePatterns: [],
    formats: ["image/avif"],
  },
};

export default nextConfig;
