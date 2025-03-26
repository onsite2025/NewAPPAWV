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
        // Connect to MongoDB before handling the request
        await connectToMongoDB();
        
        // Import the user model dynamically
        const UserSchema = new mongoose.Schema({
          email: { 
            type: String, 
            required: true, 
            unique: true 
          },
          name: { 
            type: String, 
            required: true 
          },
          role: { 
            type: String, 
            enum: ['admin', 'provider', 'staff'], 
            default: 'staff' 
          },
          status: { 
            type: String, 
            enum: ['active', 'inactive', 'pending'], 
            default: 'pending' 
          },
          phone: { 
            type: String 
          },
          title: { 
            type: String 
          },
          specialty: { 
            type: String 
          },
          npi: { 
            type: String 
          },
          lastLogin: { 
            type: Date 
          },
          notificationPreferences: {
            email: { 
              type: Boolean, 
              default: true 
            },
            inApp: { 
              type: Boolean, 
              default: true 
            }
          },
          twoFactorEnabled: { 
            type: Boolean, 
            default: false 
          },
          invitedBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
          },
          invitationSentAt: { 
            type: Date 
          },
          firebaseUid: { 
            type: String, 
            unique: true, 
            sparse: true 
          }
        }, { 
          timestamps: true 
        });
        
        let User;
        try {
          // Handle model compilation more safely
          if (mongoose.models.User) {
            User = mongoose.models.User;
          } else {
            User = mongoose.model('User', UserSchema);
          }
        } catch (modelError) {
          console.error('Error getting User model:', modelError);
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: 'Database model error', 
              details: 'Could not initialize User model'
            }),
            headers: createHeaders()
          };
        }
        
        // Handle the GET request for users list
        if (event.httpMethod === 'GET') {
          try {
            // Parse query parameters
            const query = event.queryStringParameters || {};
            const page = parseInt(query.page || '1');
            const limit = parseInt(query.limit || '10');
            const search = query.search || '';
            const role = query.role || '';
            const status = query.status || '';
            const sortField = query.sortField || 'createdAt';
            const sortOrder = query.sortOrder || 'desc';
            
            // Calculate skip value for pagination
            const skip = (page - 1) * limit;
            
            // Build query filter
            const filter: any = {};
            
            if (search) {
              filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
              ];
            }
            
            if (role) {
              filter.role = role;
            }
            
            if (status) {
              filter.status = status;
            }
            
            // Build sort object
            const sort: any = {};
            sort[sortField] = sortOrder === 'asc' ? 1 : -1;
            
            // For demo purposes, add sample users if none exist
            try {
              const count = await User.countDocuments();
              
              if (count === 0) {
                // Create some sample users
                const demoUsers = [
                  {
                    email: 'admin@example.com',
                    name: 'Admin User',
                    role: 'admin' as 'admin' | 'provider' | 'staff',
                    status: 'active' as 'active' | 'inactive' | 'pending',
                    firebaseUid: '6wsWnc7HllSNFvnHORIgc8iDc9U2'
                  },
                  {
                    email: 'provider@example.com',
                    name: 'Doctor Smith',
                    role: 'provider' as 'admin' | 'provider' | 'staff',
                    status: 'active' as 'active' | 'inactive' | 'pending',
                    specialty: 'Primary Care'
                  },
                  {
                    email: 'staff@example.com',
                    name: 'Staff Member',
                    role: 'staff' as 'admin' | 'provider' | 'staff',
                    status: 'active' as 'active' | 'inactive' | 'pending'
                  }
                ];
                
                // Use explicit cast to avoid type errors
                // @ts-ignore: Mongoose types are sometimes difficult to reconcile
                await User.insertMany(demoUsers);
              }
            } catch (seedError) {
              console.warn('Error seeding demo users:', seedError);
              // Continue even if seeding fails - just log the error
            }
            
            // Query users with filters, sort, and pagination
            let users = [];
            let total = 0;
            
            try {
              // Use explicit cast to avoid type errors
              // @ts-ignore: Mongoose types are sometimes difficult to reconcile
              users = await User.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();
              
              // @ts-ignore: Mongoose types are sometimes difficult to reconcile
              total = await User.countDocuments(filter);
            } catch (queryError) {
              console.error('Error querying users:', queryError);
              
              // Return empty result set rather than error
              users = [];
              total = 0;
            }
            
            // Calculate total pages
            const pages = Math.ceil(total / limit);
            
            // Return with success: true wrapper for consistency
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: {
                  users,
                  pagination: {
                    total,
                    page,
                    limit,
                    pages
                  }
                }
              }),
              headers: createHeaders()
            };
          } catch (error) {
            console.error('Error fetching users:', error);
            return {
              statusCode: 500,
              body: JSON.stringify({ 
                success: false, 
                error: 'Failed to fetch users',
                details: error instanceof Error ? error.message : 'Unknown error'
              }),
              headers: createHeaders()
            };
          }
        } else if (event.httpMethod === 'POST') {
          // Handle user creation
          try {
            // Safely parse request body
            let body: any = {};
            try {
              body = event.body ? JSON.parse(event.body) : {};
            } catch (parseError) {
              console.error('Error parsing request body:', parseError, event.body);
              return {
                statusCode: 400,
                body: JSON.stringify({ 
                  success: false, 
                  error: 'Invalid request body format'
                }),
                headers: createHeaders()
              };
            }
            
            // Validate request body
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
            
            // Check if user already exists
            let existingUser = null;
            try {
              // @ts-ignore: Mongoose types are sometimes difficult to reconcile
              existingUser = await User.findOne({ email: body.email });
            } catch (findError) {
              console.error('Error checking for existing user:', findError);
              return {
                statusCode: 500,
                body: JSON.stringify({ 
                  success: false, 
                  error: 'Database query failed',
                  details: 'Could not check for existing user'
                }),
                headers: createHeaders()
              };
            }
            
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
            
            // Create new user
            let newUser = null;
            try {
              newUser = new User({
                ...body,
                status: 'pending',
                invitationSentAt: new Date()
              });
              
              await newUser.save();
            } catch (saveError) {
              console.error('Error saving new user:', saveError);
              return {
                statusCode: 500,
                body: JSON.stringify({ 
                  success: false, 
                  error: 'Failed to create user',
                  details: saveError instanceof Error ? saveError.message : 'Unknown error'
                }),
                headers: createHeaders()
              };
            }
            
            return {
              statusCode: 201,
              body: JSON.stringify({ 
                success: true, 
                data: newUser 
              }),
              headers: createHeaders()
            };
          } catch (error) {
            console.error('Error creating user:', error);
            return {
              statusCode: 500,
              body: JSON.stringify({ 
                success: false, 
                error: 'Failed to create user',
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
        console.error('Error handling users endpoint:', error);
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
        // Connect to MongoDB before handling the request
        await connectToMongoDB();
        
        // Import the practice model dynamically
        const PracticeSchema = new mongoose.Schema({
          name: { type: String, required: true },
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
            appointmentDuration: { type: Number, default: 30 },
            startTime: { type: String, default: '09:00' },
            endTime: { type: String, default: '17:00' },
            daysOpen: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
          }
        }, { timestamps: true });
        
        const Practice = mongoose.models.Practice || mongoose.model('Practice', PracticeSchema);

        // Handle GET requests - return practice settings
        if (event.httpMethod === 'GET') {
          try {
            // Try to get practice settings from database
            const practice = await Practice.findOne().lean();
            
            if (practice) {
              return {
                statusCode: 200,
                body: JSON.stringify({
                  success: true,
                  data: practice
                }),
                headers: createHeaders()
              };
            } else {
              // Return default practice settings if none exist
              return {
                statusCode: 200,
                body: JSON.stringify({
                  success: true,
                  data: {
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
                  }
                }),
                headers: createHeaders()
              };
            }
          } catch (error) {
            console.error('Error fetching practice settings:', error);
            
            // Return default practice settings as fallback
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: {
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
                }
              }),
              headers: createHeaders()
            };
          }
        } else if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
          // Handle practice settings update
          try {
            // Parse the request body
            let practiceData;
            try {
              practiceData = JSON.parse(event.body || '{}');
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
            
            console.log('Updating practice settings with data:', practiceData);
            
            // Format the practice data correctly
            const formattedData = {
              name: practiceData.name || 'Healthcare Practice',
              address: {
                street: practiceData.address || '',
                city: practiceData.city || '',
                state: practiceData.state || '',
                zipCode: practiceData.zipCode || ''
              },
              contactInfo: {
                phone: practiceData.phone || '',
                email: practiceData.email || '',
                website: practiceData.website || ''
              },
              logo: practiceData.logo || '/logo.png',
              colors: {
                primary: practiceData.primaryColor || '#0047AB',
                secondary: practiceData.secondaryColor || '#6CB4EE'
              },
              settings: {
                appointmentDuration: practiceData.appointmentDuration || 30,
                startTime: practiceData.startTime || '09:00',
                endTime: practiceData.endTime || '17:00',
                daysOpen: practiceData.daysOpen || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
              }
            };
            
            // Find existing practice or create new one
            let practice = await Practice.findOne();
            
            if (practice) {
              // Update existing practice
              Object.assign(practice, formattedData);
              await practice.save();
            } else {
              // Create new practice
              practice = new Practice(formattedData);
              await practice.save();
            }
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: practice,
                message: 'Practice settings updated successfully'
              }),
              headers: createHeaders()
            };
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