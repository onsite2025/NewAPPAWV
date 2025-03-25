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
 * Connect to MongoDB database with retry logic
 */
export async function connectToDatabase(retries = 3): Promise<Connection> {
  // If we have a cached connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If there's no pending connection, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      family: 4,
      ssl: true,
      compressors: 'zlib',
      maxIdleTimeMS: 30000,
      tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
      tlsAllowInvalidHostnames: process.env.NODE_ENV === 'development',
    };

    const tryConnect = async (attempt: number): Promise<Connection> => {
      try {
        const mongoose = await import('mongoose');
        const connection = await mongoose.connect(MONGODB_URI, opts);
        console.log('✅ Connected to MongoDB');
        return connection.connection;
      } catch (err: any) {
        console.error(`❌ MongoDB connection error (attempt ${attempt}):`, err.message);
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return tryConnect(attempt + 1);
        }
        
        throw err;
      }
    };

    cached.promise = tryConnect(1)
      .then((connection) => {
        cached.conn = connection;
        return connection;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
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