/** @type {import('next').NextConfig} */

// Security headers (safe defaults)
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  // Keep your WASM config exactly as you had it
  webpack: (config) => {
    config.experiments = { ...(config.experiments || {}), asyncWebAssembly: true };
    return config;
  },

  // Optional but recommended: redirect www → apex
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.havengames.org" }],
        destination: "https://havengames.org/:path*",
        permanent: true,
      },
    ];
  },

  // Add security headers to all routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Minor hardening
  poweredByHeader: false,
};

module.exports = nextConfig;
