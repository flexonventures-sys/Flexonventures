import type { NextConfig } from "next";

// One domain, three views (proposal section 14):
//   /        public view (prototype hub)
//   /admin   organiser + referee view (prototype organiser)
//   /owner   team owner view (React)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const config: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/", destination: "/hub/index.html" },
      { source: "/admin", destination: "/organiser/index.html" },
    ];
  },
  async redirects() {
    return [
      { source: "/hub", destination: "/", permanent: true },
      { source: "/organiser", destination: "/admin", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/owner", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default config;
