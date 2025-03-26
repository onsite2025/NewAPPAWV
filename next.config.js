/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export mode
  output: 'export',
  
  // Disable experimental features that don't work with export
  experimental: {
    // Removed serverActions as they don't work with static export
  },
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  },
  
  // Enable environment variable loading in server components
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },

  // Removed rewrites() as they don't work with static export
  
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
  compiler: {
    styledComponents: true,
  },
  
  // Set a static build ID to improve caching
  generateBuildId: async () => {
    return 'awv-build'
  }
};

module.exports = nextConfig; 