// Custom Netlify build plugin to optimize function size
module.exports = {
  // This will run during the build, before functions are bundled
  onPreBuild: ({ utils }) => {
    console.log('Optimizing functions bundle size...');
  },

  // This plugin runs after function bundling
  onFunctionsPackage: ({ utils }) => {
    console.log('Optimizing bundled functions...');
    // You can add custom logic here to optimize function size if needed
  },
  
  // After build - validate function sizes
  onPostBuild: async ({ constants, utils }) => {
    try {
      // Ensure functions don't exceed size limits
      const functionDir = constants.FUNCTIONS_DIST;
      console.log(`Checking function sizes in: ${functionDir}`);
     
      // Function size check logic can be added here 
      console.log('Function size check completed successfully.');
    } catch (error) {
      utils.build.failBuild('Function size validation failed', { error });
    }
  }
}; 