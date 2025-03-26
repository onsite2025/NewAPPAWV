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

console.log('MongoDB URI found in environment, first few characters:', 
  MONGODB_URI ? `${MONGODB_URI.substring(0, 15)}...` : 'undefined');

// In-memory storage for newly created users (this will persist until the function is redeployed)
const newUsers: Record<string, any> = {};

// In-memory storage for practice settings (this will persist until the function is redeployed)
let practiceSettings: any = null;

// Define MongoDB schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String }, // Remove enum validation to accept any role
  profileImage: String,
  specialty: String,
  npiNumber: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  // This ensures _id is also available as a string in id field
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  // Explicitly set the collection name to match what's in MongoDB Atlas
  collection: 'users',
  // Make the schema less strict to accommodate existing data
  strict: false
});

// Add a pre-save hook to ensure id is set and update timestamp
UserSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  next();
});

const PracticeSettingsSchema = new mongoose.Schema({
  name: String,
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  website: String,
  logo: String,
  primaryColor: String,
  secondaryColor: String,
  appointmentDuration: Number,
  startTime: String,
  endTime: String,
  daysOpen: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  // Convert _id to string when returned as JSON
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  // Explicitly set the collection name to match what's in MongoDB Atlas
  collection: 'practicesettings',
  // Make the schema less strict to accommodate existing data
  strict: false
});

// Update timestamp on save
PracticeSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Schema for invitation tokens
const InvitationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  token: { type: String, required: true },
  role: { type: String, default: 'staff' },
  invitedBy: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'invitations',
  strict: false
});

// Function to generate a secure random token
const generateToken = () => {
  // In a real app, use a secure random method
  const randomStr = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `${randomStr}${timestamp}`;
};

// Initialize models
const getModels = () => {
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const PracticeSettings = mongoose.models.PracticeSettings || mongoose.model('PracticeSettings', PracticeSettingsSchema);
  const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', InvitationSchema);
  return { User, PracticeSettings, Invitation };
};

// Connect to MongoDB and test connection
const testMongoDBConnection = async () => {
  try {
    await connectToMongoDB();
    console.log('MongoDB connection test successful');
    
    // Test creating a simple document
    const TestSchema = new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
    
    const testDoc = new TestModel({ name: 'connection_test' });
    await testDoc.save();
    console.log('Successfully saved test document to MongoDB');
    
    return true;
  } catch (error) {
    console.error('MongoDB connection or test save failed:', error);
    return false;
  }
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

    console.log('Attempting to connect to MongoDB with URI:', 
      MONGODB_URI ? `${MONGODB_URI.substring(0, 15)}...` : 'undefined');

    // Connect to MongoDB with updated connection options for MongoDB Atlas
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 20000, // Increased timeout values
      socketTimeoutMS: 60000,
      connectTimeoutMS: 20000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      ssl: true,
      appName: "AWVApp" // Custom application name for monitoring
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
    console.log('Trying to initialize Firebase Admin SDK...');
    admin = await import('firebase-admin').then(module => module.default);
    
    // Check if Firebase Admin SDK credentials are available
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      console.log('Firebase service account credentials found');
      // Check if app is already initialized
      try {
        admin.app();
      } catch (e) {
        // Initialize app if not already done
        try {
          admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount)),
            databaseURL: process.env.FIREBASE_DATABASE_URL
          });
          console.log('Firebase Admin SDK initialized successfully');
        } catch (initError) {
          console.error('Error initializing Firebase app:', initError);
          return false;
        }
      }
      firebaseInitialized = true;
      return true;
    } else {
      console.warn('Firebase service account credentials not found - FIREBASE_SERVICE_ACCOUNT env var missing');
      return false;
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return false;
  }
};

// Helper function to map UI roles to valid MongoDB enum values
const mapRoleToValid = (role: string | undefined): string => {
  if (!role) return 'nurse'; // Default
  
  // Map to expected enum values
  switch(role.toLowerCase()) {
    case 'admin': return 'admin';
    case 'provider': 
    case 'doctor': return 'doctor';
    case 'staff':
    case 'nurse':
    default: return 'nurse';
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
    if (path === '/test-mongodb') {
      try {
        console.log('Testing MongoDB connection and document creation...');
        const connectionResult = await testMongoDBConnection();
        
        // Test saving to Users collection
        let userTestSuccess = false;
        let practiceTestSuccess = false;
        
        if (connectionResult) {
          try {
            await connectToMongoDB();
            const { User, PracticeSettings } = getModels();
            
            // Test creating a user
            const testUser = new User({
              email: `test-${Date.now()}@example.com`,
              name: 'Test User',
              role: 'nurse',
              isActive: true,
              createdAt: new Date()
            });
            
            await testUser.save();
            console.log('Successfully saved test user to MongoDB:', testUser._id);
            userTestSuccess = true;
            
            // Test creating practice settings
            const testSettings = new PracticeSettings({
              name: 'Test Practice',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            await testSettings.save();
            console.log('Successfully saved test practice settings to MongoDB:', testSettings._id);
            practiceTestSuccess = true;
          } catch (collectionError) {
            console.error('Error testing collections:', collectionError);
          }
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            status: connectionResult ? 'success' : 'error',
            details: {
              connection: connectionResult ? 'Connected to MongoDB' : 'Failed to connect to MongoDB',
              userCollection: userTestSuccess ? 'User document created successfully' : 'Failed to create user document',
              practiceSettings: practiceTestSuccess ? 'Practice settings created successfully' : 'Failed to create practice settings',
            },
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('❌ MongoDB test failed:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Database test failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          headers: createHeaders()
        };
      }
    }

    // Add a more detailed MongoDB test endpoint for our specific collections
    if (path === '/test-collections') {
      try {
        await connectToMongoDB();
        console.log('Connected to MongoDB');
        
        // Initialize our models
        const { User, PracticeSettings } = getModels();
        
        // Log collection information
        console.log('User model collection details:', {
          name: User.collection.name,
          namespace: User.collection.namespace,
          modelName: User.modelName
        });
        
        console.log('PracticeSettings model collection details:', {
          name: PracticeSettings.collection.name,
          namespace: PracticeSettings.collection.namespace,
          modelName: PracticeSettings.modelName
        });
        
        // Test creating documents
        const testUser = new User({
          email: `test-${Date.now()}@example.com`,
          password: 'test-password-123',  // Required field
          name: 'Test User',
          role: 'nurse',  // Must be one of the enum values
          isActive: true,
          createdAt: new Date()
        });
        
        const testSettings = new PracticeSettings({
          name: `Test Practice ${Date.now()}`,
          address: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          phone: '555-123-4567',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Save the documents
        let userSaveResult, settingsSaveResult;
        let userError, settingsError;
        
        try {
          const savedUser = await testUser.save();
          userSaveResult = {
            success: true,
            id: savedUser._id.toString(),
            collection: User.collection.name
          };
        } catch (error) {
          console.error('Error saving test user:', error);
          userSaveResult = { success: false };
          userError = error instanceof Error ? error.message : 'Unknown error';
        }
        
        try {
          const savedSettings = await testSettings.save();
          settingsSaveResult = {
            success: true,
            id: savedSettings._id.toString(),
            collection: PracticeSettings.collection.name
          };
        } catch (error) {
          console.error('Error saving test practice settings:', error);
          settingsSaveResult = { success: false };
          settingsError = error instanceof Error ? error.message : 'Unknown error';
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'MongoDB collection test results',
            details: {
              mongodbUri: MONGODB_URI ? `${MONGODB_URI.substring(0, MONGODB_URI.indexOf('@'))}@[hidden]` : 'undefined',
              models: {
                User: {
                  collection: User.collection.name,
                  namespace: User.collection.namespace,
                  saveResult: userSaveResult,
                  error: userError
                },
                PracticeSettings: {
                  collection: PracticeSettings.collection.name,
                  namespace: PracticeSettings.collection.namespace,
                  saveResult: settingsSaveResult,
                  error: settingsError
                }
              }
            }
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('MongoDB collection test failed:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'MongoDB collection test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Add a simple MongoDB test endpoint
    if (path === '/mongo-test') {
      try {
        await connectToMongoDB();
        
        // Create test schemas
        const TestModel = mongoose.models.TestCollection || 
          mongoose.model('TestCollection', new mongoose.Schema({
            name: String,
            createdAt: { type: Date, default: Date.now }
          }));
        
        // Create and save a test document
        const testDocument = new TestModel({ name: `test-${Date.now()}` });
        const savedDoc = await testDocument.save();
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'MongoDB connection and save test successful',
            testId: savedDoc._id.toString(),
            mongoUrl: MONGODB_URI ? MONGODB_URI.substring(0, MONGODB_URI.indexOf('@')) + '@[hidden]' : 'undefined'
          }),
          headers: createHeaders()
        };
      } catch (error) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'MongoDB test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Add a test endpoint to create a test user
    if (path === '/test-create-user') {
      try {
        await connectToMongoDB();
        const { User } = getModels();
        
        // Create a test user with all required fields matching the database schema
        const timestamp = Date.now();
        const testUser = new User({
          email: `test-user-${timestamp}@example.com`,
          password: `test-password-${timestamp}`,
          name: 'Test User Created Via Endpoint',
          role: 'nurse', // Must be one of the valid enum values: admin, doctor, nurse
          isActive: true,
          specialty: 'Test Specialty',
          npiNumber: '1234567890',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('About to save test user:', JSON.stringify(testUser, null, 2));
        
        const savedUser = await testUser.save();
        
        console.log('Successfully created test user with ID:', savedUser._id);
        
        // Return success response
        return {
          statusCode: 201,
          body: JSON.stringify({
            success: true,
            message: 'Test user created successfully',
            user: {
              id: savedUser._id.toString(),
              email: savedUser.email,
              name: savedUser.name,
              role: savedUser.role,
              collection: User.collection.name
            }
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('Error creating test user:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to create test user',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Add a diagnostic endpoint for debugging user creation
    if (path === '/debug-user-creation') {
      try {
        // Parse the request body
        const body = JSON.parse(event.body || '{}');
        
        // Log the parsed request body
        console.log('Received request body for user creation:', JSON.stringify(body, null, 2));
        
        // Check for required fields
        const requiredFields = ['email', 'name'];
        const missingFields = requiredFields.filter(field => !body[field]);
        
        // Check field types
        const fieldTypes = {
          email: 'string',
          name: 'string',
          role: 'string',
          password: 'string'
        };
        
        const fieldTypeIssues = Object.entries(fieldTypes)
          .filter(([field, expectedType]) => 
            body[field] !== undefined && typeof body[field] !== expectedType
          )
          .map(([field, expectedType]) => 
            `${field} should be ${expectedType}, got ${typeof body[field]}`
          );
        
        // Try validating against Mongoose schema
        await connectToMongoDB();
        const { User } = getModels();
        
        // Create a user document but don't save it
        const userDoc = new User({
          ...body,
          // Add a password if missing
          password: body.password || 'temp-password-123',
        });
        
        let validationErrors: any = null;
        try {
          // Just validate without saving
          await userDoc.validate();
        } catch (validationError) {
          validationErrors = validationError;
          console.error('User validation error:', validationError);
        }
        
        // Return diagnostic information
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            diagnostics: {
              receivedData: body,
              missingRequiredFields: missingFields,
              fieldTypeIssues,
              validationErrors: validationErrors 
                ? { message: validationErrors.message, errors: validationErrors.errors }
                : null,
              schemaFields: Object.keys(User.schema.paths),
              requiredSchemaFields: Object.entries(User.schema.paths)
                .filter(([_, path]: [string, any]) => path.isRequired)
                .map(([field, _]: [string, any]) => field)
            }
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('Error in user creation diagnostics:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Diagnostic error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Add raw request logging endpoint for debugging
    if (path === '/raw-request') {
      // Log the entire event object for debugging
      console.log('Raw request received:', {
        httpMethod: event.httpMethod,
        path: path,
        headers: event.headers,
        queryParams: event.queryStringParameters,
        body: event.body,
        isBase64Encoded: event.isBase64Encoded
      });
      
      let parsedBody = null;
      try {
        if (event.body) {
          parsedBody = JSON.parse(event.body);
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Raw request captured',
          request: {
            method: event.httpMethod,
            path: path,
            headers: event.headers,
            query: event.queryStringParameters,
            rawBody: event.body,
            parsedBody: parsedBody
          }
        }),
        headers: createHeaders()
      };
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
          role: { type: String, default: 'nurse' },
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
              role: (user as any).role || 'nurse',
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
              role: 'nurse',
              id: userId,
              email: 'nurse@example.com'
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
              role: "doctor",
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
              role: "nurse",
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
            // Log raw request
            console.log('POST /users raw body:', event.body);
            
            // Parse the request body
            const body = JSON.parse(event.body || '{}');
            console.log('Received user creation request with data:', JSON.stringify(body, null, 2));
            
            // Check for different data formats - UI might be sending data differently
            // Some UIs wrap the user data in a 'user' or 'data' field
            // Use TypeScript type assertion to avoid type errors
            const bodyAsAny = body as any;
            const userData = bodyAsAny.user || bodyAsAny.data || body;
            console.log('Extracted user data:', JSON.stringify(userData, null, 2));
            
            // If no data provided, return error
            if (Object.keys(userData).length === 0) {
              console.log('No user data provided in request');
              return {
                statusCode: 400,
                body: JSON.stringify({
                  success: false,
                  error: 'No user data provided'
                }),
                headers: createHeaders()
              };
            }
            
            // Validate required fields
            if (!userData.email || !userData.name) {
              console.log('Missing required fields for user creation');
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
              email: userData.email,
              name: userData.name,
              role: userData.role || 'staff', // Use role directly
              isActive: true,
              createdAt: new Date().toISOString()
            };
            
            // Store the new user in our in-memory storage
            newUsers[newUserId] = newUser;
            console.log('Created user in memory with ID:', newUserId);
            
            // Also save to MongoDB
            try {
              await connectToMongoDB();
              console.log('Connected to MongoDB, attempting to save user');
              const { User } = getModels();
              console.log('User model initialized with collection:', User.collection.name);
              
              // Check if user already exists
              const existingUser = await User.findOne({ email: userData.email });
              if (existingUser) {
                console.log('User with this email already exists:', userData.email);
                return {
                  statusCode: 409,
                  body: JSON.stringify({
                    success: false,
                    error: 'User with this email already exists'
                  }),
                  headers: createHeaders()
                };
              }
              
              // Create a proper user document for MongoDB
              const userDoc = new User({
                email: userData.email,
                // Generate a temporary password since it's required by the schema
                password: 'temp' + Date.now(), // This would be hashed in a real app
                name: userData.name,
                role: userData.role || 'staff', // Use role directly
                isActive: true,
                createdAt: new Date(),
                // Store other fields from body if they exist
                ...(userData.phone && { phone: userData.phone }),
                ...(userData.title && { title: userData.title }),
                ...(userData.specialty && { specialty: userData.specialty }),
                ...(userData.npi && { npiNumber: userData.npi })
              });
              
              console.log('User document created, about to save:', JSON.stringify(userDoc, null, 2));
              
              // Save to MongoDB - should automatically set id field via pre-save hook
              let savedUser;
              try {
                savedUser = await userDoc.save();
                console.log('User successfully saved to MongoDB with ID:', savedUser._id, 'in collection:', User.collection.name);
              } catch (saveError) {
                console.error('Error in save operation:', saveError);
                throw saveError;
              }
              
              // Get the ID for response
              newUser.id = savedUser._id.toString();
              
              // Try to create Firebase Authentication user if available
              try {
                // Initialize Firebase Admin SDK
                console.log('Attempting to initialize Firebase for user creation');
                const firebaseInitialized = await initializeFirebase();
                
                // Only proceed if Firebase is initialized
                if (firebaseInitialized && admin) {
                  console.log('Firebase initialized, attempting to create auth user');
                  try {
                    // Create Firebase Auth user with email and a temporary password
                    const firebaseUser = await admin.auth().createUser({
                      email: userData.email,
                      emailVerified: false,
                      password: 'Temp' + Date.now() + '!', // Temporary password that meets requirements
                      displayName: userData.name,
                      disabled: userData.isActive === false // Disable if not active
                    });
                    
                    console.log('Created Firebase user successfully with UID:', firebaseUser.uid);
                    
                    // Add custom claims for role
                    await admin.auth().setCustomUserClaims(firebaseUser.uid, {
                      role: userData.role || 'staff'
                    });
                    
                    // Update the user with Firebase UID
                    savedUser.firebaseUid = firebaseUser.uid;
                    await savedUser.save();
                    
                    console.log('User updated with Firebase UID and created in Firebase Authentication');
                  } catch (firebaseAuthError) {
                    console.error('Firebase Auth user creation error:', firebaseAuthError);
                  }
                } else {
                  console.log('Firebase not initialized, skipping Firebase user creation');
                }
              } catch (firebaseError) {
                console.error('Error in Firebase integration:', firebaseError);
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
            role: "doctor",
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
            role: "nurse",
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
          // First check mock users
          let user = mockUsers[userId];
          
          if (!user) {
            // Check MongoDB
            try {
              await connectToMongoDB();
              const { User } = getModels();
              
              // Try to find by MongoDB ID
              let dbUser;
              try {
                // Try to find by MongoDB _id
                dbUser = await User.findById(userId);
                
                if (dbUser) {
                  // Found in MongoDB, delete it
                  console.log(`Deleting MongoDB user with ID: ${userId}`);
                  await User.deleteOne({ _id: userId });
                  
                  return {
                    statusCode: 200,
                    body: JSON.stringify({
                      success: true,
                      message: 'User deleted successfully from database'
                    }),
                    headers: createHeaders()
                  };
                }
              } catch (idError) {
                // If not a valid ObjectId, try to find by custom id field
                dbUser = await User.findOne({ id: userId });
                
                if (dbUser) {
                  // Found by custom ID, delete it
                  await User.deleteOne({ id: userId });
                  
                  return {
                    statusCode: 200,
                    body: JSON.stringify({
                      success: true,
                      message: 'User deleted successfully from database'
                    }),
                    headers: createHeaders()
                  };
                }
              }
            } catch (dbError) {
              console.error(`Error checking MongoDB for user ${userId}:`, dbError);
            }
            
            return {
              statusCode: 404,
              body: JSON.stringify({
                success: false,
                error: 'User not found'
              }),
              headers: createHeaders()
            };
          }
          
          // For mock users - pretend we deleted the user
          console.log(`Deleted mock user: ${userId}`);
          
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
            address: '123 Medical Way',
            city: 'Oak Ridge',
            state: 'TN',
            zipCode: '37830',
            phone: '(555) 123-4567',
            email: 'info@oakridgehealthcare.example',
            website: 'www.oakridgehealthcare.example',
            logo: '/logo.png',
            primaryColor: '#0047AB',
            secondaryColor: '#6CB4EE',
            appointmentDuration: 30,
            startTime: '09:00',
            endTime: '17:00',
            daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
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
              address: practiceData.address || (practiceSettings?.address || '123 Medical Way'),
              city: practiceData.city || (practiceSettings?.city || 'Oak Ridge'),
              state: practiceData.state || (practiceSettings?.state || 'TN'),
              zipCode: practiceData.zipCode || (practiceSettings?.zipCode || '37830'),
              phone: practiceData.phone || (practiceSettings?.phone || '(555) 123-4567'),
              email: practiceData.email || (practiceSettings?.email || 'info@oakridgehealthcare.example'),
              website: practiceData.website || (practiceSettings?.website || 'www.oakridgehealthcare.example'),
              logo: practiceData.logo || (practiceSettings?.logo || '/logo.png'),
              primaryColor: practiceData.primaryColor || (practiceSettings?.primaryColor || '#0047AB'),
              secondaryColor: practiceData.secondaryColor || (practiceSettings?.secondaryColor || '#6CB4EE'),
              appointmentDuration: practiceData.appointmentDuration || (practiceSettings?.appointmentDuration || 30),
              startTime: practiceData.startTime || (practiceSettings?.startTime || '09:00'),
              endTime: practiceData.endTime || (practiceSettings?.endTime || '17:00'),
              daysOpen: practiceData.daysOpen || (practiceSettings?.daysOpen || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
              updatedAt: new Date()
            };
            
            // Store the updated settings in memory
            practiceSettings = updatedSettings;
            
            // Save to MongoDB
            try {
              // Find if settings exist
              console.log('Checking if practice settings exist in MongoDB');
              const { PracticeSettings } = getModels();
              console.log('PracticeSettings model initialized with collection:', PracticeSettings.collection.name);
              
              let dbSettings = await PracticeSettings.findOne();
              
              if (dbSettings) {
                // Update existing settings
                console.log('Found existing practice settings, updating', dbSettings._id);
                Object.assign(dbSettings, updatedSettings);
                await dbSettings.save();
                console.log('Updated practice settings in MongoDB:', dbSettings._id);
              } else {
                // Create new settings
                console.log('No existing practice settings found, creating new');
                dbSettings = new PracticeSettings(updatedSettings);
                console.log('Practice settings document created, about to save', dbSettings);
                await dbSettings.save();
                console.log('Created new practice settings in MongoDB:', dbSettings._id, 'in collection:', PracticeSettings.collection.name);
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

    // Add a direct MongoDB insertion test to bypass Mongoose validation
    if (path === '/direct-mongodb-test') {
      try {
        await connectToMongoDB();
        console.log('Connected to MongoDB directly');
        
        // Try inserting with different role values to see what's accepted
        const timestamp = Date.now();
        const testEmail = `directtest-${timestamp}@example.com`;
        
        // Get direct access to the MongoDB collection
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('MongoDB connection not established');
        }
        
        const usersCollection = db.collection('users');
        
        // Try to get collection info
        const collectionInfo = await usersCollection.options();
        console.log('Users collection info:', collectionInfo);
        
        // Try to get validation info
        let validationInfo = null;
        try {
          const dbAdmin = db.admin();
          validationInfo = await db.command({ listCollections: 1, filter: { name: 'users' } });
          console.log('Collection validation info:', JSON.stringify(validationInfo, null, 2));
        } catch (validationError) {
          console.error('Error getting validation info:', validationError);
        }
        
        // Try inserting with different roles to see what works
        const rolesToTry = ['admin', 'doctor', 'nurse', 'provider', 'staff', 'user'];
        const results: Record<string, any> = {};
        
        for (const role of rolesToTry) {
          try {
            const result = await usersCollection.insertOne({
              name: `Direct Test User ${role}`,
              email: `${role}-${testEmail}`,
              password: `test-${timestamp}`,
              role: role,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            results[role] = {
              success: true,
              id: result.insertedId.toString()
            };
            console.log(`Successfully inserted user with role "${role}"`);
          } catch (error) {
            results[role] = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
            console.error(`Failed to insert user with role "${role}":`, error);
          }
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'Direct MongoDB insert test results',
            results: results,
            collectionInfo: collectionInfo,
            validationInfo: validationInfo
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('Error in direct MongoDB test:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Direct MongoDB test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Alternative simpler user creation endpoint
    if (path === '/simple-user-create') {
      try {
        // Parse request body
        let userData;
        try {
          userData = JSON.parse(event.body || '{}');
          console.log('Simple user create with data:', userData);
        } catch (err) {
          console.error('Failed to parse request body:', err, 'Raw body:', event.body);
          return {
            statusCode: 400,
            body: JSON.stringify({
              success: false,
              error: 'Invalid JSON in request body'
            }),
            headers: createHeaders()
          };
        }
        
        if (!userData.email || !userData.name) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              success: false,
              error: 'Email and name are required'
            }),
            headers: createHeaders()
          };
        }
        
        // Connect to MongoDB
        await connectToMongoDB();
        
        // Direct database access without Mongoose models
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('MongoDB connection not established');
        }
        
        const usersCollection = db.collection('users');
        
        // Create user document
        const userDocument = {
          email: userData.email,
          name: userData.name,
          password: userData.password || 'password123', // Should be properly hashed in production
          role: userData.role || 'staff', // Use the provided role or default to staff
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert directly using the MongoDB driver
        const result = await usersCollection.insertOne(userDocument);
        
        if (result.insertedId) {
          console.log('Successfully created user with ID:', result.insertedId);
          
          return {
            statusCode: 201,
            body: JSON.stringify({
              success: true,
              message: 'User created successfully',
              user: {
                id: result.insertedId.toString(),
                email: userDocument.email,
                name: userDocument.name,
                role: userDocument.role
              }
            }),
            headers: createHeaders()
          };
        } else {
          throw new Error('Failed to insert user document');
        }
      } catch (error) {
        console.error('Error in simple user creation:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Simple user creation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }

    // Handle invitation creation endpoint - DISABLED
    if (path === '/invitations') {
      try {
        // Return an error response indicating this feature is disabled
        return {
          statusCode: 503,
          body: JSON.stringify({
            success: false,
            error: 'Invitation functionality is currently disabled'
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('Error handling invitation endpoint:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to process request',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          headers: createHeaders()
        };
      }
    }
    
    // Handle verify-invitation endpoint - DISABLED
    if (path === '/verify-invitation') {
      return {
        statusCode: 503,
        body: JSON.stringify({
          success: false,
          error: 'Invitation verification is currently disabled'
        }),
        headers: createHeaders()
      };
    }
    
    // Handle register-with-invitation endpoint - DISABLED
    if (path === '/register-with-invitation') {
      return {
        statusCode: 503,
        body: JSON.stringify({
          success: false,
          error: 'Registration functionality is currently disabled'
        }),
        headers: createHeaders()
      };
    }

    // Handle user profile endpoint
    if (path === '/users/profile') {
      try {
        // Get user ID from query parameters or authorization header
        const userId = event.queryStringParameters?.userId;
        const authHeader = event.headers?.authorization;
        
        // If no user ID is provided, check for authentication
        if (!userId && !authHeader) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              success: false,
              error: 'User ID or authorization is required'
            }),
            headers: createHeaders()
          };
        }
        
        let userIdToFetch = userId;
        
        // If we have an auth header but no userId, extract user from token
        // Note: In a real app, you would verify the JWT token
        if (authHeader && !userIdToFetch) {
          // Simple mock implementation - in reality you'd decode the JWT
          // For demo purposes, assume token is in format: "Bearer user_id"
          const parts = authHeader.split(' ');
          if (parts.length === 2) {
            userIdToFetch = parts[1];
          }
        }
        
        // If still no user ID, return error
        if (!userIdToFetch) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              success: false,
              error: 'User ID could not be determined'
            }),
            headers: createHeaders()
          };
        }
        
        // Connect to MongoDB
        await connectToMongoDB();
        const { User } = getModels();
        
        // Try to find user in MongoDB
        let dbUser;
        try {
          // First try to find by MongoDB ObjectId
          dbUser = await User.findById(userIdToFetch).lean();
        } catch (idError) {
          // If that fails, try by custom id field or email
          dbUser = await User.findOne({ 
            $or: [{ id: userIdToFetch }, { email: userIdToFetch }]
          }).lean();
        }
        
        // Check mock users if not found in database
        if (!dbUser) {
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
              npi: null,
              profileImage: "https://randomuser.me/api/portraits/men/1.jpg"
            },
            "2": {
              id: "2",
              email: "provider@example.com",
              name: "Provider User",
              role: "doctor",
              status: "active",
              profileImage: "https://randomuser.me/api/portraits/women/2.jpg"
            },
            "3": {
              id: "3",
              email: "staff@example.com",
              name: "Staff User",
              role: "nurse",
              status: "active",
              profileImage: "https://randomuser.me/api/portraits/women/3.jpg"
            }
          };
          
          // Try to find in mock users by ID
          let mockUser = mockUsers[userIdToFetch];
          
          // If not found by ID, try by email
          if (!mockUser) {
            for (const id in mockUsers) {
              if (mockUsers[id].email === userIdToFetch) {
                mockUser = mockUsers[id];
                break;
              }
            }
          }
          
          // Also check in-memory users
          let memoryUser = null;
          for (const id in newUsers) {
            if (id === userIdToFetch || newUsers[id].email === userIdToFetch) {
              memoryUser = newUsers[id];
              break;
            }
          }
          
          // If found in mock or memory, return it
          if (mockUser || memoryUser) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: mockUser || memoryUser
              }),
              headers: createHeaders()
            };
          }
          
          // Not found anywhere
          return {
            statusCode: 404,
            body: JSON.stringify({
              success: false,
              error: 'User not found'
            }),
            headers: createHeaders()
          };
        }
        
        // Format the MongoDB user for response
        const userObj = dbUser as any;
        const { _id, password, __v, ...rest } = userObj;
        const formattedUser = { 
          id: _id.toString(), 
          ...rest,
          // Add default profile image if none exists
          profileImage: rest.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(rest.name)}&background=random`
        };
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            data: formattedUser
          }),
          headers: createHeaders()
        };
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch user profile',
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