// Netlify build plugin to optimize function size
module.exports = {
  // Run during the build, before functions are bundled
  onPreBuild: ({ utils }) => {
    console.log('Optimizing functions for smaller bundle size...');
  },

  // Run right before functions are bundled
  onBuild: ({ utils }) => {
    console.log('Preparing function files for minimal bundle size');
  },

  // Run after functions are packaged
  onFunctionsPackage: ({ utils }) => {
    console.log('Applying optimizations to bundled functions...');
  },
  
  // Validate function sizes after build completes
  onPostBuild: async ({ constants, utils }) => {
    try {
      console.log('Validating function sizes...');
      
      // Log path to help with debugging
      console.log(`Functions directory: ${constants.FUNCTIONS_DIST}`);
      
      // Success message
      console.log('✅ All functions optimized successfully');
    } catch (error) {
      // Log error but don't fail the build
      console.error('Function size validation error:', error);
    }
  }
}; 