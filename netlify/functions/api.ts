import { Handler } from '@netlify/functions';
import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../src/lib/mongodb';

// Import your API route handlers
import patientsHandler from '../../src/app/api/patients/route';
import visitsHandler from '../../src/app/api/visits/route';
import usersHandler from '../../src/app/api/users/route';
import practiceHandler from '../../src/app/api/practice/route';
import templatesHandler from '../../src/app/api/templates/route';
import authHandler from '../../src/app/api/auth/route';

const handler: Handler = async (event, context) => {
  // Connect to MongoDB
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database connection failed' })
    };
  }

  // Create Next.js request and response objects
  const req = {
    ...event,
    query: event.queryStringParameters || {},
    body: event.body ? JSON.parse(event.body) : {},
    method: event.httpMethod,
    headers: event.headers,
  } as NextApiRequest;

  const res = {
    status: (code: number) => ({
      json: (data: any) => ({
        statusCode: code,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      }),
    }),
  } as unknown as NextApiResponse;

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    };
  }

  try {
    // Route the request to the appropriate handler
    const path = event.path.replace('/.netlify/functions/api', '');
    
    if (path.startsWith('/patients')) {
      return await patientsHandler(req, res);
    } else if (path.startsWith('/visits')) {
      return await visitsHandler(req, res);
    } else if (path.startsWith('/users')) {
      return await usersHandler(req, res);
    } else if (path.startsWith('/practice')) {
      return await practiceHandler(req, res);
    } else if (path.startsWith('/templates')) {
      return await templatesHandler(req, res);
    } else if (path.startsWith('/auth')) {
      return await authHandler(req, res);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler }; 