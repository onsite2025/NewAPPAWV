import mongoose, { Connection } from 'mongoose';

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
  conn: Connection | null;
  promise: Promise<Connection> | null;
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
async function connectToDatabase(): Promise<Connection> {
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
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true,
    };

    // Gracefully handle connection
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose): Connection => {
        console.log('✅ Connected to MongoDB');
        return mongoose.connection;
      })
      .catch((err: Error) => {
        console.error('❌ MongoDB connection error:', err.message);
        
        // Provide specific error messages based on error code
        if ((err as any).code === 8000) {
          console.error('Authentication failed. Please check your MongoDB username and password.');
        } else if ((err as any).code === 'ENOTFOUND') {
          console.error('Server not found. Please check your MongoDB connection string.');
        } else if ((err as any).code === 'ETIMEDOUT') {
          console.error('Connection timed out. Please check your network and MongoDB server status.');
        } else if ((err as any).code === 'ECONNREFUSED') {
          console.error('Connection refused. Please check if MongoDB server is running.');
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
    
    // Log detailed error information
    const error = err as Error;
    console.error('Failed to connect to MongoDB:', {
      error: error.message,
      code: (err as any).code,
      stack: error.stack,
      uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@') // Hide credentials
    });
    
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

export default connectToDatabase; 