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
          
          // Parse query parameters for pagination if provided
          const page = parseInt(event.queryStringParameters?.page || '1');
          const limit = parseInt(event.queryStringParameters?.limit || '10');
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              data: {
                users: mockUsers,
                pagination: {
                  total: mockUsers.length,
                  page: page,
                  limit: limit,
                  pages: Math.ceil(mockUsers.length / limit)
                }
              }
            }),
            headers: createHeaders()
          };
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
            
            // Create a mock successful response
            return {
              statusCode: 201,
              body: JSON.stringify({
                success: true,
                data: {
                  id: Date.now().toString(),
                  email: body.email,
                  name: body.name,
                  role: body.role || 'staff',
                  status: 'pending',
                  createdAt: new Date().toISOString()
                }
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
    if (path.match(/^\/users\/\d+$/)) {
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
          // Retrieve the user
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
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              data: user
            }),
            headers: createHeaders()
          };
        }
        
        else if (event.httpMethod === 'PUT') {
          // Update the user
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
          
          try {
            // Parse the request body
            const body = JSON.parse(event.body || '{}');
            
            // Update the user (in a real app, this would update in the database)
            const updatedUser = {
              ...user,
              ...body,
              updatedAt: new Date().toISOString()
            };
            
            // For demo purposes - pretend we updated the user
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
          // Return static practice settings for demo purposes
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
            
            // For demo, reflect back the data that was sent, with some defaults for missing fields
            const updatedSettings = {
              name: practiceData.name || 'Oak Ridge Healthcare Center',
              address: practiceData.address || '123 Medical Way',
              city: practiceData.city || 'Oak Ridge',
              state: practiceData.state || 'TN',
              zipCode: practiceData.zipCode || '37830',
              phone: practiceData.phone || '(555) 123-4567',
              email: practiceData.email || 'info@oakridgehealthcare.example',
              website: practiceData.website || 'www.oakridgehealthcare.example',
              logo: practiceData.logo || '/logo.png',
              primaryColor: practiceData.primaryColor || '#0047AB',
              secondaryColor: practiceData.secondaryColor || '#6CB4EE',
              appointmentDuration: practiceData.appointmentDuration || 30,
              startTime: practiceData.startTime || '09:00',
              endTime: practiceData.endTime || '17:00'
            };
            
            console.log('Saving practice settings:', updatedSettings);
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                data: updatedSettings,
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