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
  console.log('Attempting to connect to MongoDB...');
  
  // If we have a cached connection, return it
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
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

    console.log('MongoDB connection options:', JSON.stringify(opts, null, 2));

    const tryConnect = async (attempt: number): Promise<Connection> => {
      try {
        console.log(`Attempting MongoDB connection (attempt ${attempt}/${retries})...`);
        const mongoose = await import('mongoose');
        
        // Log current mongoose state
        console.log('Current Mongoose connection state:', mongoose.connection.readyState);
        console.log('Current Mongoose models:', Object.keys(mongoose.models));
        
        const connection = await mongoose.connect(MONGODB_URI, opts);
        console.log('✅ Successfully connected to MongoDB');
        
        // Log connection details
        console.log('Connection readyState:', connection.connection.readyState);
        console.log('Database name:', connection.connection.name);
        console.log('Host:', connection.connection.host);
        
        return connection.connection;
      } catch (err: any) {
        console.error(`❌ MongoDB connection error (attempt ${attempt}):`, {
          message: err.message,
          code: err.code,
          name: err.name,
          stack: err.stack
        });
        
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
        console.log('MongoDB connection cached');
        return connection;
      })
      .catch((err) => {
        cached.promise = null;
        console.error('Failed to establish MongoDB connection:', err);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error('Error resolving MongoDB connection promise:', err);
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