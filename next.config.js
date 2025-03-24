/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output: 'export' for static site generation
  output: 'standalone',
  
  // Modern config for handling dynamic routes
  experimental: {
    // These features are supported in newer Next.js
    serverComponentsExternalPackages: ['date-fns'],
  },
  
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig; 