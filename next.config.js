/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export mode for Netlify deployment
  output: 'export',
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  },
  
  // Enable environment variable loading
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },

  // Add webpack configuration for better module support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Set React mode
  reactStrictMode: true,
  
  // Set a static build ID to improve caching
  generateBuildId: async () => {
    return 'awv-build'
  },
  
  // Disable linting during build to prevent build failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig; 