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
  
  // Only dynamically import the real connection when needed
  const { default: connectToDatabase } = await import('./mongodb');
  return connectToDatabase();
};

// Safe user lookup that prevents database queries during build
export const safeGetUser = async (email: string) => {
  if (isBuildTime()) {
    console.log('Build time detected - returning mock user');
    return {
      _id: 'mock-id',
      email,
      name: 'Mock User',
      role: 'user'
    };
  }
  
  // This should be wrapped in a try/catch in the actual implementation
  try {
    const mongoose = (await import('mongoose')).default;
    const { default: User } = await import('@/models/User');
    
    if (mongoose.connection.readyState !== 1) {
      await safeConnectToDatabase();
    }
    
    return User.findOne({ email });
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}; 