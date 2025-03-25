/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output: 'export' for static site generation
  output: 'standalone',
  
  // Enable experimental features for API routes
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['mongoose']
  },
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  },
  
  // Enable environment variable loading in server components
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    NODE_ENV: process.env.NODE_ENV,
  },

  // Configure rewrites to handle API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/.netlify/functions/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig; 