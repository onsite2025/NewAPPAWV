/**
 * This utility file helps prevent direct database access during prerendering.
 * It exports functions that safely return mock data during build/prerender
 * and only access the actual database during runtime.
 */

// Check if we're in a build/prerender environment
export const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined';
};

// Safe database connection that prevents connections during build
export const safeConnectToDatabase = async () => {
  if (isBuildTime()) {
    console.log('Build time detected - skipping database connection');
    return null;
  }
  
  try {
    // Only dynamically import the real connection when needed
    const { default: connectToDatabase } = await import('./mongodb');
    return connectToDatabase();
  } catch (error) {
    console.error('Error connecting to database:', error);
    return null;
  }
};

// Create a mock schema and model if needed during build time
export const createMockModel = (modelName: string) => {
  if (isBuildTime()) {
    console.log(`Build time detected - creating mock ${modelName} model`);
    
    // Create a simple mock schema
    const mongoose = require('mongoose');
    const MockSchema = new mongoose.Schema({}, { strict: false });
    
    // Create a "dummy" model that won't actually be used for DB operations
    const MockModel = {
      findOne: async () => ({}),
      find: async () => [],
      findById: async () => ({}),
      create: async () => ({}),
      findByIdAndUpdate: async () => ({}),
      findByIdAndDelete: async () => ({}),
      populate: () => MockModel,
      lean: () => ({}),
      // Add any other methods your app uses
    };
    
    return MockModel;
  }
  
  return null;
};

// Safe user lookup that prevents database queries during build
export const safeGetUser = async (email: string) => {
  if (isBuildTime()) {
    console.log('Build time detected - returning mock user');
    return {
      _id: 'mock-id',
      email,
      name: 'Mock User',
      role: 'staff'
    };
  }
  
  // This should be wrapped in a try/catch in the actual implementation
  try {
    const mongoose = (await import('mongoose')).default;
    let User;
    
    try {
      // Try to import User model
      const { default: UserModel } = await import('@/models/User');
      User = UserModel;
    } catch (error) {
      console.error('Error importing User model:', error);
      return null;
    }
    
    if (mongoose.connection.readyState !== 1) {
      await safeConnectToDatabase();
    }
    
    return User.findOne({ email });
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}; 