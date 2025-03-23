require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    // Don't log the full connection string, it contains credentials
    console.log('Using MONGODB_URI from environment variables');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Connected to MongoDB successfully!');
    
    // Check if collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Try to find users
    const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
    console.log(`Found ${users.length} users`);
    if (users.length > 0) {
      console.log('First user:', {
        id: users[0]._id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role
      });
    }
    
    // Try to find templates
    const templates = await mongoose.connection.db.collection('templates').find({}).limit(5).toArray();
    console.log(`Found ${templates.length} templates`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

testConnection(); 