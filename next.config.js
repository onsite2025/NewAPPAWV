/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output: 'export' for static site generation
  output: 'standalone',
  
  // Updated configuration for Next.js 15.2.3
  serverExternalPackages: [], // Remove date-fns to avoid conflict
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig; 