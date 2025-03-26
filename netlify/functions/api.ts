import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

// Import your API route handlers
import { GET as getPatients, POST as postPatient, PUT as putPatient, DELETE as deletePatient } from '../../src/app/api/patients/route';
import { GET as getPatientById, PUT as putPatientById, DELETE as deletePatientById } from '../../src/app/api/patients/[id]/route';
import { GET as getVisits, POST as postVisit } from '../../src/app/api/visits/route';
import { GET as getVisitById, PUT as putVisit, DELETE as deleteVisit } from '../../src/app/api/visits/[id]/route';
import { GET as getUsers, POST as postUser } from '../../src/app/api/users/route';
import { GET as getPractice } from '../../src/app/api/practice/route';
import { GET as getTemplates, POST as postTemplate, PUT as putTemplate, DELETE as deleteTemplate } from '../../src/app/api/templates/route';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

// In-memory storage for newly created users (this will persist until the function is redeployed)
const newUsers: Record<string, any> = {};

// In-memory storage for practice settings (this will persist until the function is redeployed)
let practiceSettings: any = null;

// Define MongoDB schemas
const UserSchema = new mongoose.Schema({
  id: String,
  email: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'staff' },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  phone: String,
  title: String,
  specialty: String,
  npi: String
});

const PracticeSettingsSchema = new mongoose.Schema({
  name: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String
  },
  logo: String,
  colors: {
    primary: String,
    secondary: String
  },
  settings: {
    appointmentDuration: Number,
    startTime: String,
    endTime: String,
    daysOpen: [String]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Initialize models
const getModels = () => {
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const PracticeSettings = mongoose.models.PracticeSettings || mongoose.model('PracticeSettings', PracticeSettingsSchema);
  return { User, PracticeSettings };
};

const connectToMongoDB = async () => {
  try {
    // Check if we're already connected
    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return mongoose;
    }

    // If we're connecting or disconnecting, wait for the connection to be ready
    if (mongoose.connection.readyState === 2 || mongoose.connection.readyState === 3) {
      console.log('Waiting for MongoDB connection to be ready...');
      await new Promise<void>((resolve) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', (err) => {
          console.error('MongoDB connection error:', err);
          resolve();
        });
      });
    }

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      ssl: true,
    });
    console.log('✅ Connected to MongoDB');
    return mongoose;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

const createHeaders = (cors: boolean = true): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (cors) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  }
  
  return headers;
};

// Dynamic Firebase Admin import
let admin: any = null;
let firebaseInitialized = false;

const initializeFirebase = async () => {
  if (firebaseInitialized) return;
  
  try {
    // Dynamically import Firebase Admin
    admin = await import('firebase-admin').then(module => module.default);
    
    // Check if Firebase Admin SDK credentials are available
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      // Check if app is already initialized
      try {
        admin.app();
      } catch (e) {
        // Initialize app if not already done
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }
      console.log('Firebase Admin SDK initialized');
      firebaseInitialized = true;
    } else {
      console.warn('Firebase service account not available, skipping Firebase integration');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // Set function timeout
  context.callbackWaitsForEmptyEventLoop = false;

  // Create Next.js request object
  const headers = new Headers();
  Object.entries(event.headers || {}).forEach(([key, value]) => {
    if (value) {
      headers.append(key, value);
    }
  });

  const request = new NextRequest(event.rawUrl, {
    method: event.httpMethod,
    headers,
    body: event.body ? event.body : undefined,
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: createHeaders()
    };
  }

  try {
    // Route the request to the appropriate handler
    const path = event.path.replace('/.netlify/functions/api', '');
    
    // Add a test endpoint to verify MongoDB connection
    if (path === '/test-connection') {
      try {
        await connectToMongoDB();
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            status: 'success',
            message: 'MongoDB connection is working',
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('❌ MongoDB connection test failed:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Database connection failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      }
    }

    // Log request details
    console.log('Processing request:', {
      method: event.httpMethod,
      path,
      query: event.queryStringParameters
    });

    // Handle dynamic routes for patients
    if (path.startsWith('/patients/')) {
      const patientId = path.split('/')[2];
      const handlers: Record<string, Function> = {
        GET: getPatientById,
        PUT: putPatientById,
        DELETE: deletePatientById
      };

      const handler = handlers[event.httpMethod];
      if (!handler) {
        return {
          statusCode: 405,
          body: JSON.stringify({ 
            error: 'Method not allowed',
            method: event.httpMethod,
            path,
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      }

      try {
        // Connect to MongoDB before handling the request
        await connectToMongoDB();
        
        // Handle the request with the patient ID
        const response = await handler(request, { params: { id: patientId } });
        
        // Convert Response to Netlify function response
        const responseData = await response.json();
        
        return {
          statusCode: response.status,
          body: JSON.stringify(responseData),
          headers: createHeaders()
        };
      } catch (error) {
        console.error(`Error handling patient ${patientId}:`, error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
            path,
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle dynamic routes for visits
    if (path.startsWith('/visits/')) {
      const visitId = path.split('/')[2];
      const handlers: Record<string, Function> = {
        GET: getVisitById,
        PUT: putVisit,
        DELETE: deleteVisit
      };

      const handler = handlers[event.httpMethod];
      if (!handler) {
        return {
          statusCode: 405,
          body: JSON.stringify({ 
            error: 'Method not allowed',
            method: event.httpMethod,
            path,
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      }

      try {
        // Connect to MongoDB before handling the request
        await connectToMongoDB();
        
        // Handle the request with the visit ID
        const response = await handler(request, { params: { id: visitId } });
        
        // Convert Response to Netlify function response
        const responseData = await response.json();
        
        return {
          statusCode: response.status,
          body: JSON.stringify(responseData),
          headers: createHeaders()
        };
      } catch (error) {
        console.error(`Error handling visit ${visitId}:`, error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
            path,
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle user role requests
    if (path.startsWith('/users/role')) {
      try {
        // Get the userId from query parameters
        const userId = event.queryStringParameters?.userId;
        
        if (!userId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User ID is required' }),
            headers: createHeaders()
          };
        }
        
        // Connect to MongoDB before handling the request
        await connectToMongoDB();
        
        // Import the user model dynamically
        const UserSchema = new mongoose.Schema({
          email: { type: String, required: true, unique: true },
          role: { type: String, default: 'staff' },
          name: String,
          photoURL: String,
          createdAt: { type: Date, default: Date.now }
        });
        
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        
        // Special handling for admin users (hardcoded for testing)
        if (userId === '6wsWnc7HllSNFvnHORIgc8iDc9U2') {
          return {
            statusCode: 200,
            body: JSON.stringify({
              role: 'admin',
              id: userId,
              email: 'admin@example.com'
            }),
            headers: createHeaders()
          };
        }
        
        try {
          const user = await User.findOne({ _id: userId }).lean();
          
          if (!user) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'User not found' }),
              headers: createHeaders()
            };
          }
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              role: (user as any).role || 'staff',
              id: (user as any)._id,
              email: (user as any).email
            }),
            headers: createHeaders()
          };
        } catch (error) {
          console.error('Error fetching user role:', error);
          
          // Fallback to default role for demo/testing
          return {
            statusCode: 200, 
            body: JSON.stringify({
              role: 'staff',
              id: userId,
              email: 'staff@example.com'
            }),
            headers: createHeaders()
          };
        }
      } catch (error) {
        console.error('Error handling user role request:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Internal server error', 
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle user-related endpoints specifically
    if (path === '/users') {
      try {
        // Simple, direct implementation for the users endpoint
        if (event.httpMethod === 'GET') {
          // Return mock user data for demonstration
          const mockUsers = [
            {
              id: "1",
              email: "admin@example.com",
              name: "Admin User",
              role: "admin",
              status: "active",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              phone: "555-123-4567",
              title: "Administrator",
              specialty: null,
              npi: null
            },
            {
              id: "2",
              email: "provider@example.com",
              name: "Provider User",
              role: "provider",
              status: "active",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              phone: "555-987-6543",
              title: "Physician",
              specialty: "Primary Care",
              npi: "1234567890"
            },
            {
              id: "3",
              email: "staff@example.com",
              name: "Staff User",
              role: "staff",
              status: "active",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              phone: "555-567-1234",
              title: "Medical Assistant",
              specialty: null,
              npi: null
            }
          ];
          
          // Connect to MongoDB and fetch users
          try {
            await connectToMongoDB();
            const { User } = getModels();
            
            // Fetch users from MongoDB
            const dbUsers = await User.find({}).lean();
            console.log(`Found ${dbUsers.length} users in MongoDB`);
            
            // Combine with mock users and in-memory users
            // Convert MongoDB _id to id for consistency
            const formattedDbUsers = dbUsers.map(user => {
              // Handle TypeScript typing for MongoDB document
              const userObj = user as any;
              const { _id, __v, ...rest } = userObj;
              return { id: _id.toString(), ...rest };
            });
            
            // Add newly created users to the list
            const combinedUsers = [...mockUsers, ...formattedDbUsers, ...Object.values(newUsers)];
            
            // Parse query parameters for pagination if provided
            const queryPage = parseInt(event.queryStringParameters?.page || '1');
            const queryLimit = parseInt(event.queryStringParameters?.limit || '10');
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: {
                  users: combinedUsers,
                  pagination: {
                    total: combinedUsers.length,
                    page: queryPage,
                    limit: queryLimit,
                    pages: Math.ceil(combinedUsers.length / queryLimit)
                  }
                }
              }),
              headers: createHeaders()
            };
          } catch (dbError) {
            console.error('Error fetching users from MongoDB:', dbError);
            
            // Fall back to mock + in-memory users
            const fallbackUsers = [...mockUsers, ...Object.values(newUsers)];
            
            // Parse query parameters for pagination if provided
            const fallbackPage = parseInt(event.queryStringParameters?.page || '1');
            const fallbackLimit = parseInt(event.queryStringParameters?.limit || '10');
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: {
                  users: fallbackUsers,
                  pagination: {
                    total: fallbackUsers.length,
                    page: fallbackPage,
                    limit: fallbackLimit,
                    pages: Math.ceil(fallbackUsers.length / fallbackLimit)
                  }
                },
                warning: 'Could not fetch users from database'
              }),
              headers: createHeaders()
            };
          }
        }
        
        if (event.httpMethod === 'POST') {
          try {
            // Parse the request body
            const body = JSON.parse(event.body || '{}');
            
            // Validate required fields
            if (!body.email || !body.name) {
              return {
                statusCode: 400,
                body: JSON.stringify({
                  success: false,
                  error: 'Email and name are required'
                }),
                headers: createHeaders()
              };
            }
            
            // Create a new user ID
            const newUserId = Date.now().toString();
            const newUser = {
              id: newUserId,
              email: body.email,
              name: body.name,
              role: body.role || 'staff',
              status: 'pending',
              createdAt: new Date().toISOString()
            };
            
            // Store the new user in our in-memory storage
            newUsers[newUserId] = newUser;
            
            // Also save to MongoDB
            try {
              await connectToMongoDB();
              const { User } = getModels();
              
              // Check if user already exists
              const existingUser = await User.findOne({ email: body.email });
              if (existingUser) {
                return {
                  statusCode: 409,
                  body: JSON.stringify({
                    success: false,
                    error: 'User with this email already exists'
                  }),
                  headers: createHeaders()
                };
              }
              
              // Save to MongoDB
              const userDoc = new User(newUser);
              await userDoc.save();
              console.log('User saved to MongoDB:', userDoc);
              
              // Try to create Firebase Authentication user if available
              try {
                // Initialize Firebase Admin SDK
                await initializeFirebase();
                
                // Only proceed if Firebase is initialized
                if (firebaseInitialized && admin) {
                  // Create Firebase Auth user with email and a temporary password
                  const firebaseUser = await admin.auth().createUser({
                    email: body.email,
                    emailVerified: false,
                    password: 'Temp' + Date.now() + '!', // Temporary password that meets requirements
                    displayName: body.name,
                    disabled: body.status === 'pending' // Disable if pending
                  });
                  
                  console.log('Created Firebase user:', firebaseUser.uid);
                  
                  // Add custom claims for role
                  await admin.auth().setCustomUserClaims(firebaseUser.uid, {
                    role: body.role || 'staff'
                  });
                  
                  // Update the user with Firebase UID
                  userDoc.firebaseUid = firebaseUser.uid;
                  await userDoc.save();
                  
                  console.log('User created in Firebase Authentication');
                }
              } catch (firebaseError) {
                console.error('Error creating Firebase user:', firebaseError);
                // Continue without Firebase - it's not critical for the demo
              }
              
              return {
                statusCode: 201,
                body: JSON.stringify({
                  success: true,
                  data: newUser,
                  message: 'User created successfully'
                }),
                headers: createHeaders()
              };
            } catch (dbError) {
              console.error('Error saving user to MongoDB:', dbError);
              // Even if MongoDB save fails, return success with in-memory user
              // for demo purposes
              return {
                statusCode: 201,
                body: JSON.stringify({
                  success: true,
                  data: newUser,
                  warning: 'User created in memory but database save failed'
                }),
                headers: createHeaders()
              };
            }
          } catch (parseError) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                success: false,
                error: 'Invalid request format'
              }),
              headers: createHeaders()
            };
          }
        }
        
        return {
          statusCode: 405,
          body: JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('Error in /users endpoint:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle individual user requests (/users/:id)
    if (path.match(/^\/users\/[^\/]+$/)) {
      try {
        // Extract the user ID from the path
        const userId = path.split('/')[2];
        console.log(`Individual user operation for user ID: ${userId}`);
        
        // Simulate user data (in a real app, this would be fetched from database)
        const mockUsers: Record<string, any> = {
          "1": {
            id: "1",
            email: "admin@example.com",
            name: "Admin User",
            role: "admin",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            phone: "555-123-4567",
            title: "Administrator",
            specialty: null,
            npi: null
          },
          "2": {
            id: "2",
            email: "provider@example.com",
            name: "Provider User",
            role: "provider",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            phone: "555-987-6543",
            title: "Physician",
            specialty: "Primary Care",
            npi: "1234567890"
          },
          "3": {
            id: "3",
            email: "staff@example.com",
            name: "Staff User",
            role: "staff",
            status: "active",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            phone: "555-567-1234",
            title: "Medical Assistant",
            specialty: null,
            npi: null
          }
        };
        
        // Handle different HTTP methods
        if (event.httpMethod === 'GET') {
          // First check mock users and newly created users
          const mockUser = mockUsers[userId] || newUsers[userId];
          
          // If found in memory, return it
          if (mockUser) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: mockUser
              }),
              headers: createHeaders()
            };
          }
          
          // Otherwise check MongoDB
          try {
            await connectToMongoDB();
            const { User } = getModels();
            
            // Try to find by MongoDB ID
            let dbUser;
            try {
              // Try to find by MongoDB _id
              dbUser = await User.findById(userId).lean();
            } catch (idError) {
              // If not a valid ObjectId, try to find by our custom id field
              dbUser = await User.findOne({ id: userId }).lean();
            }
            
            if (!dbUser) {
              return {
                statusCode: 404,
                body: JSON.stringify({
                  success: false,
                  error: 'User not found'
                }),
                headers: createHeaders()
              };
            }
            
            // Format the user for response
            const userObj = dbUser as any;
            const { _id, __v, ...rest } = userObj;
            const formattedUser = { id: _id.toString(), ...rest };
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: formattedUser
              }),
              headers: createHeaders()
            };
          } catch (dbError) {
            console.error('Error fetching user from MongoDB:', dbError);
            
            return {
              statusCode: 404,
              body: JSON.stringify({
                success: false,
                error: 'User not found',
                details: 'Database error occurred'
              }),
              headers: createHeaders()
            };
          }
        }
        
        else if (event.httpMethod === 'PUT') {
          // Update the user - check both mock users and newly created users
          let user = mockUsers[userId] || newUsers[userId];
          let isMongoUser = false;
          
          if (!user) {
            // Check MongoDB
            try {
              await connectToMongoDB();
              const { User } = getModels();
              
              // Try to find by MongoDB ID or custom id
              let dbUser;
              try {
                dbUser = await User.findById(userId).lean();
              } catch (idError) {
                dbUser = await User.findOne({ id: userId }).lean();
              }
              
              if (dbUser) {
                // Format the user from MongoDB
                const userObj = dbUser as any;
                const { _id, __v, ...rest } = userObj;
                user = { id: _id.toString(), ...rest };
                isMongoUser = true;
              } else {
                return {
                  statusCode: 404,
                  body: JSON.stringify({
                    success: false,
                    error: 'User not found'
                  }),
                  headers: createHeaders()
                };
              }
            } catch (dbError) {
              console.error('Error fetching user from MongoDB:', dbError);
              return {
                statusCode: 404,
                body: JSON.stringify({
                  success: false,
                  error: 'User not found',
                  details: 'Database error occurred'
                }),
                headers: createHeaders()
              };
            }
          }
          
          try {
            // Parse the request body
            const body = JSON.parse(event.body || '{}');
            
            // Update the user
            const updatedUser = {
              ...user,
              ...body,
              updatedAt: new Date().toISOString()
            };
            
            if (isMongoUser) {
              // Update in MongoDB
              try {
                await connectToMongoDB();
                const { User } = getModels();
                
                // Determine how to find the user
                let query = {};
                try {
                  // If the ID is a valid MongoDB ID
                  if (mongoose.Types.ObjectId.isValid(userId)) {
                    query = { _id: userId };
                  } else {
                    // Otherwise use the custom id field
                    query = { id: userId };
                  }
                  
                  // Update the user in MongoDB
                  await User.updateOne(query, updatedUser);
                  console.log('Updated user in MongoDB:', updatedUser);
                } catch (updateError) {
                  console.error('Error updating user in MongoDB:', updateError);
                }
              } catch (dbError) {
                console.error('Error connecting to MongoDB:', dbError);
              }
            } else {
              // Update in the appropriate storage (mock or new users)
              if (mockUsers[userId]) {
                mockUsers[userId] = updatedUser;
              } else if (newUsers[userId]) {
                newUsers[userId] = updatedUser;
              }
            }
            
            console.log('Updated user:', updatedUser);
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: updatedUser,
                message: 'User updated successfully'
              }),
              headers: createHeaders()
            };
          } catch (parseError) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                success: false,
                error: 'Invalid request format'
              }),
              headers: createHeaders()
            };
          }
        }
        
        else if (event.httpMethod === 'DELETE') {
          // Delete the user
          const user = mockUsers[userId];
          
          if (!user) {
            return {
              statusCode: 404,
              body: JSON.stringify({
                success: false,
                error: 'User not found'
              }),
              headers: createHeaders()
            };
          }
          
          // For demo purposes - pretend we deleted the user
          console.log(`Deleted user: ${userId}`);
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              message: 'User deleted successfully'
            }),
            headers: createHeaders()
          };
        }
        
        return {
          statusCode: 405,
          body: JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error(`Error handling user ${path}:`, error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle practice settings requests
    if (path === '/practice') {
      try {
        // Handle GET requests - return practice settings
        if (event.httpMethod === 'GET') {
          // Connect to MongoDB
          await connectToMongoDB();
          const { PracticeSettings } = getModels();
          
          // Try to fetch settings from MongoDB first
          try {
            const dbSettings = await PracticeSettings.findOne().sort({ updatedAt: -1 });
            
            if (dbSettings) {
              console.log('Returning practice settings from MongoDB');
              return {
                statusCode: 200,
                body: JSON.stringify({
                  success: true,
                  data: dbSettings
                }),
                headers: createHeaders()
              };
            }
          } catch (dbError) {
            console.error('Error fetching practice settings from MongoDB:', dbError);
          }
          
          // Fall back to in-memory settings if available
          if (practiceSettings) {
            console.log('Returning stored practice settings from memory');
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: practiceSettings
              }),
              headers: createHeaders()
            };
          }
          
          // Default settings
          const demoSettings = {
            name: 'Oak Ridge Healthcare Center',
            address: {
              street: '123 Medical Way',
              city: 'Oak Ridge',
              state: 'TN',
              zipCode: '37830'
            },
            contactInfo: {
              phone: '(555) 123-4567',
              email: 'info@oakridgehealthcare.example',
              website: 'www.oakridgehealthcare.example'
            },
            logo: '/logo.png',
            colors: {
              primary: '#0047AB',
              secondary: '#6CB4EE'
            },
            settings: {
              appointmentDuration: 30,
              startTime: '09:00',
              endTime: '17:00',
              daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            }
          };
          
          // Store default settings
          practiceSettings = demoSettings;
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              data: demoSettings
            }),
            headers: createHeaders()
          };
        } 
        
        // Handle updates to practice settings
        else if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
          try {
            // Parse the request body
            let practiceData;
            try {
              practiceData = JSON.parse(event.body || '{}');
              console.log('Received practice data:', practiceData);
            } catch (parseError) {
              console.error('Error parsing practice settings data:', parseError);
              return {
                statusCode: 400,
                body: JSON.stringify({
                  success: false,
                  error: 'Invalid request data format'
                }),
                headers: createHeaders()
              };
            }
            
            // Connect to MongoDB
            await connectToMongoDB();
            const { PracticeSettings } = getModels();
            
            // Update stored settings in memory
            const updatedSettings = {
              name: practiceData.name || (practiceSettings?.name || 'Oak Ridge Healthcare Center'),
              address: {
                street: practiceData.address?.street || (practiceSettings?.address?.street || '123 Medical Way'),
                city: practiceData.address?.city || (practiceSettings?.address?.city || 'Oak Ridge'),
                state: practiceData.address?.state || (practiceSettings?.address?.state || 'TN'),
                zipCode: practiceData.address?.zipCode || (practiceSettings?.address?.zipCode || '37830')
              },
              contactInfo: {
                phone: practiceData.contactInfo?.phone || (practiceSettings?.contactInfo?.phone || '(555) 123-4567'),
                email: practiceData.contactInfo?.email || (practiceSettings?.contactInfo?.email || 'info@oakridgehealthcare.example'),
                website: practiceData.contactInfo?.website || (practiceSettings?.contactInfo?.website || 'www.oakridgehealthcare.example')
              },
              logo: practiceData.logo || (practiceSettings?.logo || '/logo.png'),
              colors: {
                primary: practiceData.colors?.primary || (practiceSettings?.colors?.primary || '#0047AB'),
                secondary: practiceData.colors?.secondary || (practiceSettings?.colors?.secondary || '#6CB4EE')
              },
              settings: {
                appointmentDuration: practiceData.settings?.appointmentDuration || (practiceSettings?.settings?.appointmentDuration || 30),
                startTime: practiceData.settings?.startTime || (practiceSettings?.settings?.startTime || '09:00'),
                endTime: practiceData.settings?.endTime || (practiceSettings?.settings?.endTime || '17:00'),
                daysOpen: practiceData.settings?.daysOpen || (practiceSettings?.settings?.daysOpen || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
              },
              updatedAt: new Date()
            };
            
            // Store the updated settings in memory
            practiceSettings = updatedSettings;
            
            // Save to MongoDB
            try {
              // Find if settings exist
              let dbSettings = await PracticeSettings.findOne();
              
              if (dbSettings) {
                // Update existing settings
                Object.assign(dbSettings, updatedSettings);
                await dbSettings.save();
                console.log('Updated practice settings in MongoDB');
              } else {
                // Create new settings
                dbSettings = new PracticeSettings(updatedSettings);
                await dbSettings.save();
                console.log('Created new practice settings in MongoDB');
              }
              
              return {
                statusCode: 200,
                body: JSON.stringify({
                  success: true,
                  data: dbSettings,
                  message: 'Practice settings updated successfully'
                }),
                headers: createHeaders()
              };
            } catch (dbError) {
              console.error('Error saving practice settings to MongoDB:', dbError);
              
              // Fall back to in-memory storage
              return {
                statusCode: 200,
                body: JSON.stringify({
                  success: true,
                  data: updatedSettings,
                  warning: 'Settings updated in memory but database save failed'
                }),
                headers: createHeaders()
              };
            }
          } catch (error) {
            console.error('Error updating practice settings:', error);
            return {
              statusCode: 500,
              body: JSON.stringify({
                success: false,
                error: 'Failed to update practice settings',
                details: error instanceof Error ? error.message : 'Unknown error'
              }),
              headers: createHeaders()
            };
          }
        } else {
          return {
            statusCode: 405,
            body: JSON.stringify({
              success: false,
              error: 'Method not allowed'
            }),
            headers: createHeaders()
          };
        }
      } catch (error) {
        console.error('Error handling practice settings request:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            success: false,
            error: 'Internal server error', 
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle practice logo upload
    if (path === '/practice/logo') {
      try {
        if (event.httpMethod === 'POST') {
          // Mock successful logo upload
          // In a real app, you would use a service like Cloudinary or S3
          // to store the image and return the URL
          
          console.log('Practice logo upload requested');
          
          // Return a mock successful response
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              success: true,
              data: {
                logoUrl: 'https://placehold.co/400x200?text=Logo+Uploaded',
                message: 'Logo uploaded successfully'
              }
            }),
            headers: createHeaders()
          };
        } else {
          return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
            headers: createHeaders()
          };
        }
      } catch (error) {
        console.error('Error handling practice logo upload:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to upload logo', 
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Map routes to handlers
    const routes: Record<string, Record<string, Function>> = {
      '/patients': {
        GET: getPatients,
        POST: postPatient,
        PUT: putPatient,
        DELETE: deletePatient
      },
      '/visits': {
        GET: getVisits,
        POST: postVisit
      },
      '/users': {
        GET: getUsers,
        POST: postUser
      },
      '/practice': {
        GET: getPractice
      },
      '/templates': {
        GET: getTemplates,
        POST: postTemplate,
        PUT: putTemplate,
        DELETE: deleteTemplate
      }
    };

    // Find the appropriate handler
    const routeHandlers = routes[path];
    if (!routeHandlers) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Not found',
          path,
          timestamp: new Date().toISOString()
        }),
        headers: createHeaders()
      };
    }

    const handler = routeHandlers[event.httpMethod];
    if (!handler) {
      return {
        statusCode: 405,
        body: JSON.stringify({ 
          error: 'Method not allowed',
          method: event.httpMethod,
          path,
          timestamp: new Date().toISOString()
        }),
        headers: createHeaders()
      };
    }

    try {
      // Connect to MongoDB before handling the request
      await connectToMongoDB();
      
      // Handle the request
      const response = await handler(request);
      
      // Convert Response to Netlify function response
      const responseData = await response.json();
      
      return {
        statusCode: response.status,
        body: JSON.stringify(responseData),
        headers: createHeaders()
      };
    } catch (error) {
      console.error(`Error handling ${path}:`, error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
          path,
          timestamp: new Date().toISOString()
        }),
        headers: createHeaders()
      };
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      headers: createHeaders()
    };
  }
};

export { handler }; 