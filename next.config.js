/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

module.exports = {
  webpack: (config) => {
    config.experiments = { ...(config.experiments || {}), asyncWebAssembly: true };
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  poweredByHeader: false,
};
