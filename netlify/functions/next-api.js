// Simple proxy for API routes in Next.js App Router
const { MongoClient } = require('mongodb');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://onsitepcn:8Pkn4n0rUeT25VsQ@cluster1.cv9ak.mongodb.net/annual-wellness-visit";
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    cachedClient = client;
    return client;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Extract path and query parameters
  const path = event.path.replace('/.netlify/functions/next-api', '');
  console.log(`API Request: ${event.httpMethod} ${path}`);
  
  try {
    // Connect to MongoDB
    const client = await connectToDatabase();
    const db = client.db();
    
    // Simplified API handling - we'll implement a basic patients endpoint
    if (path === '/patients' && event.httpMethod === 'GET') {
      const patientsCollection = db.collection('patients');
      const limit = parseInt(event.queryStringParameters?.limit || '10');
      const patients = await patientsCollection.find({}).limit(limit).toArray();
      
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patients,
          pagination: {
            total: await patientsCollection.countDocuments({}),
            page: 1,
            limit,
            pages: Math.ceil(await patientsCollection.countDocuments({}) / limit)
          }
        })
      };
    }
    
    // Example patients/count endpoint for dashboard
    if (path === '/patients/count' && event.httpMethod === 'GET') {
      const patientsCollection = db.collection('patients');
      const count = await patientsCollection.countDocuments({});
      
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      };
    }
    
    // Example endpoint for recent patients
    if (path === '/dashboard/analytics' && event.httpMethod === 'GET') {
      // This would normally query multiple collections for dashboard data
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentPatients: [],
          visitMetrics: {
            totalScheduled: 0,
            completedToday: 0,
            upcomingThisWeek: 0
          },
          patientMetrics: {
            total: 0,
            newThisMonth: 0,
            activeThisYear: 0
          }
        })
      };
    }
    
    // If we reach here, the endpoint wasn't found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'API endpoint not found' })
    };
  } catch (error) {
    console.error("API error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
}; 