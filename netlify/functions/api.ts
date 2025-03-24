import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../src/lib/mongodb';

// Import your API route handlers
import { GET as getPatients, POST as postPatient } from '../../src/app/api/patients/route';
import { GET as getVisits, POST as postVisit } from '../../src/app/api/visits/route';
import { GET as getUsers, POST as postUser } from '../../src/app/api/users/route';
import { GET as getPractice } from '../../src/app/api/practice/route';
import { GET as getTemplates } from '../../src/app/api/templates/route';

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

  // Connect to MongoDB with timeout
  try {
    const connectionPromise = connectToDatabase();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database connection failed' }),
      headers: createHeaders(false)
    };
  }

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
    
    let response: NextResponse;
    
    if (path.startsWith('/patients')) {
      response = event.httpMethod === 'GET' 
        ? await getPatients(request)
        : await postPatient(request);
    } else if (path.startsWith('/visits')) {
      response = event.httpMethod === 'GET'
        ? await getVisits(request)
        : await postVisit(request);
    } else if (path.startsWith('/users')) {
      response = event.httpMethod === 'GET'
        ? await getUsers(request)
        : await postUser(request);
    } else if (path.startsWith('/practice')) {
      response = await getPractice(request);
    } else if (path.startsWith('/templates')) {
      response = await getTemplates(request);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' }),
        headers: createHeaders(false)
      };
    }

    // Convert NextResponse to Netlify Function response
    const responseData = await response.json();
    return {
      statusCode: response.status,
      body: JSON.stringify(responseData),
      headers: createHeaders()
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: createHeaders(false)
    };
  }
};

export { handler }; 