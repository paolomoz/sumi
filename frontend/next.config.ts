import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/output/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/output/:path*`,
      },
    ];
  },
};

export default nextConfig;
