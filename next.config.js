/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output: 'export' for static site generation
  output: 'standalone',
  
  // Updated configuration for Next.js 15.2.3
  serverExternalPackages: [], // Remove date-fns to avoid conflict
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  },
  
  // Enable static export for API routes
  trailingSlash: true,
  
  // Enable environment variable loading in server components
  // This is needed for API routes to access MongoDB URI
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  }
};

module.exports = nextConfig; 