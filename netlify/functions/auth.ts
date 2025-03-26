import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import connectToDatabase from "../../src/lib/mongodb";
import NextAuth from "next-auth";
import { authOptions } from "../../src/lib/auth";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Extract the path and method from the event
  const path = event.path.replace(/^\/\.netlify\/functions\/auth/, "");
  const { httpMethod } = event;
  
  try {
    // Initialize NextAuth with our auth options
    const nextAuthHandler = NextAuth(authOptions);
    
    // Connect to MongoDB if needed
    await connectToDatabase();
    
    // Create a mock Next.js request and response for NextAuth to use
    const req: Record<string, any> = {
      method: httpMethod,
      headers: event.headers,
      url: path,
      body: event.body ? JSON.parse(event.body) : undefined,
      query: event.queryStringParameters || {},
      cookies: {} as Record<string, string>
    };
    
    // Extract cookies from the request headers
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie: string) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          req.cookies[name] = value;
        }
      });
    }
    
    // Create a mock response object that captures the response data
    let statusCode = 200;
    let responseBody = '';
    let headers: Record<string, string> = {};
    
    const res: Record<string, any> = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        responseBody = JSON.stringify(body);
        headers = {
          ...headers,
          'Content-Type': 'application/json'
        };
        return res;
      },
      setHeader: (name: string, value: string) => {
        headers[name] = value;
        return res;
      },
      getHeader: (name: string) => {
        return headers[name];
      },
      send: (body: any) => {
        responseBody = typeof body === 'string' ? body : JSON.stringify(body);
        return res;
      },
      end: () => {
        // Do nothing, just a placeholder
      }
    };
    
    // Call the NextAuth handler with our mock request and response
    await nextAuthHandler(req, res);
    
    // Return the response in the format expected by Netlify functions
    return {
      statusCode,
      body: responseBody,
      headers
    };
  } catch (error) {
    console.error('Error in auth function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

export { handler }; 