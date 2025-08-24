/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Needed so Next can bundle & run the WASM for resvg on the server
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    };
    return config;
  },
};

module.exports = nextConfig;
