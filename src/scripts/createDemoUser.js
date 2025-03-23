// This script creates a demo user in Firebase Authentication
// Run with: node src/scripts/createDemoUser.js

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
async function createDemoUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');
    
    // Define User schema to match the one in our app
    const UserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['admin', 'provider', 'assistant'], default: 'provider' },
      profileImage: String,
      specialty: String,
      npiNumber: String,
      isActive: { type: Boolean, default: true },
      lastLogin: Date
    }, { timestamps: true });
    
    // Define the model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    
    // Check if demo user already exists
    const existingUser = await User.findOne({ email: 'demo@example.com' });
    
    if (existingUser) {
      console.log('Demo user already exists:', {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role
      });
      return;
    }
    
    // Create demo user with hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123', salt);
    
    const demoUser = new User({
      name: 'Demo User',
      email: 'demo@example.com',
      password: hashedPassword,
      role: 'admin',
      specialty: 'Family Medicine',
      npiNumber: '1234567890',
      isActive: true
    });
    
    await demoUser.save();
    
    console.log('Demo user created successfully:', {
      id: demoUser._id,
      name: demoUser.name,
      email: demoUser.email,
      role: demoUser.role
    });
    console.log('Login credentials:');
    console.log('Email: demo@example.com');
    console.log('Password: Password123');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error creating demo user:', error);
  }
}

createDemoUser(); 