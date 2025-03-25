import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

// Import your API route handlers
import { GET as getPatients, POST as postPatient, PUT as putPatient, DELETE as deletePatient } from '../../src/app/api/patients/route';
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