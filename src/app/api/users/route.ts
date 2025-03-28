import { NextResponse } from 'next/server';
import { safeConnectToDatabase, isBuildTime, createMockModel } from '@/lib/prerender-workaround';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Static export configuration
export const dynamic = 'force-static';
export const fetchCache = 'force-no-store';
export const revalidate = 3600; // Revalidate every hour

// Proper User model import with build-time safety
let User: any = null;

// Initialize User model safely
const initUserModel = async () => {
  if (isBuildTime()) {
    // Use mock model during build
    User = createMockModel('User');
    return;
  }
  
  try {
    // Try to use the existing import first
    if (!User) {
      try {
        // Dynamically import User model
        const UserModule = await import('@/models/User');
        User = UserModule.default;
      } catch (importError) {
        console.error('Error importing User model:', importError);
        
        // Define schema only if needed
        const UserSchema = new mongoose.Schema({
          email: { 
            type: String, 
            required: true, 
            unique: true 
          },
          name: { 
            type: String, 
            required: true 
          },
          role: { 
            type: String, 
            enum: ['admin', 'provider', 'staff'], 
            default: 'staff' 
          },
          status: { 
            type: String, 
            enum: ['active', 'inactive', 'pending'], 
            default: 'pending' 
          },
          phone: { 
            type: String 
          },
          title: { 
            type: String 
          },
          specialty: { 
            type: String 
          },
          npi: { 
            type: String 
          },
          lastLogin: { 
            type: Date 
          },
          notificationPreferences: {
            email: { 
              type: Boolean, 
              default: true 
            },
            inApp: { 
              type: Boolean, 
              default: true 
            }
          },
          twoFactorEnabled: { 
            type: Boolean, 
            default: false 
          },
          invitedBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
          },
          invitationSentAt: { 
            type: Date 
          },
          firebaseUid: { 
            type: String, 
            unique: true, 
            sparse: true 
          }
        }, { 
          timestamps: true 
        });
        
        // Create the model only if it doesn't exist
        User = mongoose.models.User || mongoose.model('User', UserSchema);
      }
    }
  } catch (error) {
    console.error('Error initializing User model:', error);
    User = createMockModel('User');
  }
};

// Initialize right away
initUserModel();

// Helper function to check if the user has admin role
const isUserAdmin = async (session: any) => {
  if (!session?.user?.email) return false;
  
  // Skip DB lookup during build
  if (isBuildTime()) {
    return true; // Mock admin status during build
  }
  
  // Ensure User model is initialized
  await initUserModel();
  
  const user = await User.findOne({ email: session.user.email });
  return user?.role === 'admin';
};

// Helper function to check if the user has provider or admin role
const isUserAdminOrProvider = async (session: any) => {
  if (!session?.user?.email) return false;
  
  // Skip DB lookup during build
  if (isBuildTime()) {
    return true; // Mock admin/provider status during build
  }
  
  // Ensure User model is initialized
  await initUserModel();
  
  const user = await User.findOne({ email: session.user.email });
  return user?.role === 'admin' || user?.role === 'provider';
};

// GET /api/users - Get all users (admin and provider only)
export async function GET(request: Request) {
  try {
    // Connect to the database safely
    await safeConnectToDatabase();
    
    // Initialize User model
    await initUserModel();
    
    // Get the user session
    const session = await getServerSession(authOptions);
    
    // Check if the user is authorized
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    
    // Only admin and provider roles can access user list
    const isAuthorized = await isUserAdminOrProvider(session);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to access this resource.' },
        { status: 403 }
      );
    }

    // For build time, return mock data
    if (isBuildTime()) {
      return NextResponse.json({
        users: [{ name: 'Mock User', email: 'mock@example.com', role: 'admin' }],
        pagination: { total: 1, page: 1, limit: 10, pages: 1 }
      });
    }
    
    // Get query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const status = url.searchParams.get('status') || '';
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Build query filter
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Build sort object
    const sort: any = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
    
    // Query users with filters, sort, and pagination
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);
    
    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: Request) {
  try {
    // Connect to the database
    await safeConnectToDatabase();
    
    // Get the user session
    const session = await getServerSession(authOptions);
    
    // Check if the user is authorized
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    
    // Only admin role can create users directly
    const isAuthorized = await isUserAdmin(session);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can create users.' },
        { status: 403 }
      );
    }
    
    // Get the current user to set as inviter
    const invitedBy = await User.findOne({ email: session.user.email });
    
    // Get request body
    const body = await request.json();
    
    // Validate request body
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create new user
    const newUser = new User({
      ...body,
      status: 'pending', // New users are pending until they accept invitation
      invitedBy: invitedBy?._id,
      invitationSentAt: new Date()
    });
    
    // Save new user
    await newUser.save();
    
    // TODO: In a real app, send invitation email here
    // You would use a service like SendGrid, Mailgun, etc.
    
    return NextResponse.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 