/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'python-shell',
      'rasterio',
      'h5py'
    ]
  },
  output: 'standalone',
  typescript: {
    // Temporarily ignoring typescript errors during development
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignoring eslint errors during development
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
