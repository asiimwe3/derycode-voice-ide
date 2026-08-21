/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/derycode-voice-ide',
  assetPrefix: '/derycode-voice-ide/',
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig;
