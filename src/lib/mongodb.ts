import mongoose from 'mongoose';

/**
 * Simple MongoDB connection utility that safely handles connections
 * during build time and runtime
 */

// Check if we're in build/prerender
const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.NETLIFY;
};

// Connection state
let isConnected = false;

async function connectToDatabase() {
  // Skip actual connection during build time
  if (isBuildTime()) {
    console.log('Build detected - skipping MongoDB connection');
    return;
  }

  // If already connected, return
  if (isConnected) {
    return;
  }

  // Get MongoDB URI
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI environment variable is not defined');
    return;
  }

  try {
    // Connect with mongoose
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

export default connectToDatabase;

/**
 * Closes the MongoDB connection gracefully
 */
export async function closeMongoDBConnection(): Promise<void> {
  try {
    // Only close if we're connected
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed successfully');
    }
    
    // Reset state
    isConnected = false;
  } catch (err) {
    console.error('Error during MongoDB connection closure:', err);
    throw err;
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB connection closure:', err);
    process.exit(1);
  }
});