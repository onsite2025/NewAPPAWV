/** @type {import('next').NextConfig} */
const nextConfig = {
  // Change from 'standalone' to standard output mode
  // 'standalone' can sometimes cause issues with prerendering client components
  output: 'export',
  
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
  },
  
  // Disable static optimization to prevent issues with client-side hooks
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  
  // Set a static build ID to improve caching
  generateBuildId: async () => {
    return 'awv-build'
  },
  
  // Skip specific pages from static generation
  exportPathMap: async function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    return {
      ...defaultPathMap,
      '/register': { page: '/register' },
    }
  }
};

module.exports = nextConfig; 