import mongoose from 'mongoose';

// Maximum number of connection attempts
const MAX_CONNECTION_ATTEMPTS = 5;
// Initial delay (in ms) for retry attempts with exponential backoff
const INITIAL_RETRY_DELAY = 1000;
// Timeout (in ms) for connection attempts
const CONNECTION_TIMEOUT = 30000;
// Health check interval (in ms)
const HEALTH_CHECK_INTERVAL = 30000;

// Check if MongoDB URI is defined
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

const MONGODB_URI = process.env.MONGODB_URI;

// Connection options with best practices for production
const options: mongoose.ConnectOptions = {
  connectTimeoutMS: CONNECTION_TIMEOUT,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: CONNECTION_TIMEOUT,
  heartbeatFrequencyMS: 10000, // More frequent heartbeats to detect connection issues
};

// Connection state interface
interface ConnectionState {
  isConnected: number;
  readyState?: number;
  client?: mongoose.Connection;
  dbName?: string;
  healthCheckInterval?: NodeJS.Timeout;
}

// Global connection state
const globalState: ConnectionState = {
  isConnected: 0,
};

/**
 * Performs a health check on the MongoDB connection
 */
async function performHealthCheck() {
  if (!globalState.client || globalState.readyState !== 1) {
    console.log('MongoDB connection health check: Not connected, attempting reconnect...');
    try {
      await connectToDatabase();
      console.log('MongoDB connection health check: Successfully reconnected');
    } catch (err: any) {
      console.error('MongoDB connection health check: Failed to reconnect', err);
    }
  } else {
    // Check if the connection is actually responsive
    try {
      // Perform a lightweight operation to test connection
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      } else {
        throw new Error('MongoDB connection db is undefined');
      }
    } catch (err: any) {
      console.error('MongoDB connection health check: Connection unresponsive', err);
      // Force close and reconnect
      try {
        await mongoose.connection.close();
        globalState.isConnected = 0;
        globalState.readyState = 0;
        await connectToDatabase();
        console.log('MongoDB connection health check: Successfully reconnected after unresponsive connection');
      } catch (reconnectErr: any) {
        console.error('MongoDB connection health check: Failed to reconnect after unresponsive connection', reconnectErr);
      }
    }
  }
}

/**
 * Connects to MongoDB with retry logic and connection pooling
 */
export default async function connectToDatabase(): Promise<mongoose.Connection> {
  // If we already have a connection, return it
  if (globalState.isConnected === 1) {
    return mongoose.connection;
  }

  // If connection is in progress
  if (mongoose.connection.readyState === 2) {
    // Wait for connection to establish
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
  if (mongoose.connection.readyState === 1) {
          clearInterval(checkInterval);
          resolve(mongoose.connection);
        } else if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
          clearInterval(checkInterval);
          reject(new Error('MongoDB connection failed while waiting'));
        }
      }, 100);
      
      // Set a timeout to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timed out while waiting for MongoDB connection'));
      }, 5000);
    });
  }

  // Use exponential backoff for connection retries
  let attempt = 0;
  let delay = INITIAL_RETRY_DELAY;

  while (attempt < MAX_CONNECTION_ATTEMPTS) {
    attempt++;
    try {
      // Clear any existing health check interval
      if (globalState.healthCheckInterval) {
        clearInterval(globalState.healthCheckInterval);
      }

      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI, options);
      
      // Update global state
      globalState.isConnected = mongoose.connection.readyState;
      globalState.readyState = mongoose.connection.readyState;
      globalState.client = mongoose.connection;
      
      if (mongoose.connection.db) {
        globalState.dbName = mongoose.connection.db.databaseName;
      } else {
        globalState.dbName = 'unknown';
      }
      
      // Set up health check interval
      globalState.healthCheckInterval = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL);
      
      // Set up connection event listeners
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected, will attempt to reconnect');
        globalState.isConnected = 0;
        globalState.readyState = 0;
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        // Only attempt reconnect if we haven't already started one
        if (globalState.isConnected === 1) {
          globalState.isConnected = 0;
          globalState.readyState = 0;
        }
      });
      
      console.log(`✓ MongoDB connected successfully to database: ${globalState.dbName}`);
      return mongoose.connection;
    } catch (err: any) {
      console.error(`❌ MongoDB connection error (attempt ${attempt}):`, {
        message: err.message,
        code: err.code,
        attempt,
        maxAttempts: MAX_CONNECTION_ATTEMPTS,
      });
      
      // If we've reached max attempts, throw
      if (attempt >= MAX_CONNECTION_ATTEMPTS) {
        console.error('Failed to establish MongoDB connection after maximum attempts');
        throw err;
      }
      
      // Wait before next attempt with exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw new Error('Failed to establish MongoDB connection: Max attempts reached');
}

/**
 * Closes the MongoDB connection gracefully
 */
export async function closeMongoDBConnection(): Promise<void> {
  try {
    // Clear health check interval
    if (globalState.healthCheckInterval) {
      clearInterval(globalState.healthCheckInterval);
      globalState.healthCheckInterval = undefined;
    }
    
    // Only close if we're connected
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed successfully');
    }
    
    // Reset state
    globalState.isConnected = 0;
    globalState.readyState = 0;
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