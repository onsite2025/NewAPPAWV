import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Practice Settings model schema
const PracticeSettingsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  taxId: {
    type: String
  },
  npi: {
    type: String
  },
  logo: {
    type: String
  }
}, {
  timestamps: true
});

// Get the Practice model
const PracticeSettings = mongoose.models.PracticeSettings || mongoose.model('PracticeSettings', PracticeSettingsSchema);

// Get the User model
const User = mongoose.models.User || mongoose.model('User');

// Helper function to check if the user has provider or admin role
const isUserAdminOrProvider = async (session: any) => {
  if (!session?.user?.email) return false;
  
  const user = await User.findOne({ email: session.user.email });
  return user?.role === 'admin' || user?.role === 'provider';
};

// GET /api/practice - Get practice settings (any authenticated user)
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the user session
    const session = await getServerSession(authOptions);
    
    // Check if the user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    
    // Find practice settings - there should only be one document
    let practiceSettings = await PracticeSettings.findOne().lean();
    
    // If no settings exist yet, create default settings
    if (!practiceSettings) {
      practiceSettings = new PracticeSettings({
        name: 'Healthcare Wellness Center',
        address: '123 Medical Drive',
        city: 'Healthville',
        state: 'CA',
        zipCode: '90210',
        phone: '(555) 123-4567',
        email: 'info@healthcarewellness.com',
        website: 'www.healthcarewellness.com'
      });
      
      await practiceSettings.save();
      practiceSettings = practiceSettings.toObject();
    }
    
    return NextResponse.json(practiceSettings);
  } catch (error) {
    console.error('Error fetching practice settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice settings' },
      { status: 500 }
    );
  }
}

// PUT /api/practice - Update practice settings (admin or provider only)
export async function PUT(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the user session
    const session = await getServerSession(authOptions);
    
    // Check if the user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    
    // Only admin and provider roles can update practice settings
    const isAuthorized = await isUserAdminOrProvider(session);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to update practice settings.' },
        { status: 403 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.address || !body.city || !body.state || !body.zipCode || !body.phone || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find practice settings - there should only be one document
    let practiceSettings = await PracticeSettings.findOne();
    
    // If no settings exist yet, create a new settings document
    if (!practiceSettings) {
      practiceSettings = new PracticeSettings(body);
    } else {
      // Update existing settings
      Object.assign(practiceSettings, body);
    }
    
    // Save settings
    await practiceSettings.save();
    
    return NextResponse.json(practiceSettings);
  } catch (error) {
    console.error('Error updating practice settings:', error);
    return NextResponse.json(
      { error: 'Failed to update practice settings' },
      { status: 500 }
    );
  }
} 