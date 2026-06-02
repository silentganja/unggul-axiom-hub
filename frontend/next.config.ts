import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker multi-stage build

  // Strict security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",          value: "DENY" },
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Redirect /v1/info to /v/info
  async redirects() {
    return [
      {
        source: "/v1/info",
        destination: "/v/info",
        permanent: true,
      },
      {
        source: "/v1/info/:path*",
        destination: "/v/info/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
