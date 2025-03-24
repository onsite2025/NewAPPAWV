/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent static generation of dynamic routes
    disableStaticGeneration: true,
  },
  // Configure unstable_allowDynamic to prevent prerendering of specific files
  unstable_allowDynamic: [
    '**/node_modules/date-fns/**',
    '**/src/app/dashboard/visits/**',
    '**/src/services/**',
  ],
  // Disable image optimization for improved build compatibility
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig; 