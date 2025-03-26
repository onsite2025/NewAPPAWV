import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Import only what's needed to reduce bundle size
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    // Extract the path and method from the event
    const path = event.path.replace(/^\/\.netlify\/functions\/auth/, "");
    const { httpMethod } = event;
    
    // Dynamically import dependencies only when needed - this reduces initial bundle size
    const { default: connectToDatabase } = await import("../../src/lib/mongodb");
    const { default: NextAuth } = await import("next-auth");
    const { authOptions } = await import("../../src/lib/auth");
    
    // Connect to MongoDB only if needed
    await connectToDatabase();
    
    // Initialize NextAuth with auth options
    const nextAuthHandler = NextAuth(authOptions);
    
    // Create mock request
    const req: Record<string, any> = {
      method: httpMethod,
      headers: event.headers,
      url: path,
      body: event.body ? JSON.parse(event.body) : undefined,
      query: event.queryStringParameters || {},
      cookies: {} as Record<string, string>
    };
    
    // Extract cookies
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie: string) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          req.cookies[name] = value;
        }
      });
    }
    
    // Create mock response
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
        headers['Content-Type'] = 'application/json';
        return res;
      },
      setHeader: (name: string, value: string) => {
        headers[name] = value;
        return res;
      },
      getHeader: (name: string) => headers[name],
      send: (body: any) => {
        responseBody = typeof body === 'string' ? body : JSON.stringify(body);
        return res;
      },
      end: () => {}
    };
    
    // Process request through NextAuth
    await nextAuthHandler(req, res);
    
    // Return Netlify function response
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
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

export { handler }; 