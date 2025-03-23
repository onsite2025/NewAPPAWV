import mongoose from 'mongoose';

// Check for MongoDB URI
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Global mongoose connection cache
 */
interface ConnectionCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

// Use a module-scoped variable to cache the connection
let cached: ConnectionCache = {
  conn: null,
  promise: null
};

/**
 * Connect to MongoDB database
 * This function handles connection retry logic and caching
 */
async function connectToDatabase(): Promise<mongoose.Connection> {
  // If we have a cached connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If there's no pending connection, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    };

    // Gracefully handle connection
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then(mongoose => {
        console.log('✅ Connected to MongoDB');
        return mongoose.connection;
      })
      .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        
        // Provide specific error messages based on error code
        if (err.code === 8000) {
          console.error('Authentication failed. Please check your MongoDB username and password.');
        } else if (err.code === 'ENOTFOUND') {
          console.error('Server not found. Please check your MongoDB connection string.');
        } else if (err.code === 'ETIMEDOUT') {
          console.error('Connection timed out. Please check your network and MongoDB server status.');
        }
        
        // Reset promise so next call will try again
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    // Reset promise for next attempt
    cached.promise = null;
    
    // In development mode, provide more context for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('⚠️ Using development mode without MongoDB connection. Some features may not work properly.');
      console.error('Please ensure your MongoDB connection details are correct in .env.local');
    }
    
    throw err;
  }
}

export default connectToDatabase; 