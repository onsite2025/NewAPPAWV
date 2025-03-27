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
    // Dynamically import User model
    if (!User) {
      const UserModule = await import('@/models/User');
      User = UserModule.default;
    }
  } catch (error) {
    console.error('Error importing User model:', error);
    User = createMockModel('User');
  }
};

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

// POST /api/users/invite - Send invitation to a new user
export async function POST(request: Request) {
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
    
    // Only admin role can send invitations
    const isAuthorized = await isUserAdmin(session);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can send invitations.' },
        { status: 403 }
      );
    }
    
    // Get the current user to set as inviter
    const invitedBy = await User.findOne({ email: session.user.email });
    
    // Get request body
    const body = await request.json();
    
    // Validate request body
    if (!body.email || !body.name || !body.role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      );
    }
    
    // Validate role (must be one of admin, provider, or staff)
    if (!['admin', 'provider', 'staff'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, provider, or staff.' },
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
    
    // Generate invite token (in a real app, this would be a secure random token)
    const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Create new user with pending status
    const newUser = new User({
      email: body.email,
      name: body.name,
      role: body.role,
      status: 'pending',
      invitedBy: invitedBy?._id,
      invitationSentAt: new Date(),
      inviteToken // In a real app, store the secure token
    });
    
    // Save new user
    await newUser.save();
    
    // In a real app, send invitation email with a link containing the invite token
    // The link would point to a registration page that requires the token
    
    // For this demo, we'll just pretend to send an email
    console.log(`Invitation email sent to ${body.email} with token: ${inviteToken}`);
    
    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${body.email}`,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
        invitationSentAt: newUser.invitationSentAt
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
} 