/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output: 'export' for static site generation
  output: 'standalone',
  
  // Enable experimental features for API routes
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'finalawv.netlify.app']
    }
  },
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  },
  
  // Enable environment variable loading in server components
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },

  // Configure rewrites to handle API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/.netlify/functions/api/:path*'
      }
    ];
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
  }
};

module.exports = nextConfig; 