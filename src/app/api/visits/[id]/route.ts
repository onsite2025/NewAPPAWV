import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import { z } from 'zod';

// Static export configuration
export const dynamic = 'force-static';
export const fetchCache = 'force-no-store';
export const revalidate = 3600; // Revalidate every hour

// Define a response function to standardize all API responses
function apiResponse(data: any = null, status = 200, error: string | null = null) {
  const body: any = {};
  
  if (error) {
    body.success = false;
    body.error = error;
  } else {
    body.success = true;
    if (data !== null) {
      body.data = data;
    }
  }
  
  return NextResponse.json(body, { status });
}

// Define Visit schema
const VisitSchema = new mongoose.Schema({
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient',
    required: true 
  },
  provider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false 
  },
  scheduledDate: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled' 
  },
  visitType: {
    type: String,
    default: 'check-up'
  },
  templateId: {
    type: String,
    required: false
  },
  responses: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  healthPlan: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  notes: String,
  completedSections: [Number]
}, { 
  timestamps: true 
});

// Get or create the Visit model
const Visit = mongoose.models.Visit || mongoose.model('Visit', VisitSchema);

// Zod schema for validation
const VisitUpdateSchema = z.object({
  patient: z.string().optional(),
  provider: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']).optional(),
  visitType: z.string().optional(),
  templateId: z.string().optional(),
  responses: z.record(z.any()).optional(),
  healthPlan: z.any().optional(),
  notes: z.string().optional(),
  completedSections: z.array(z.number()).optional()
});

// GET /api/visits/[id] - Fetch a specific visit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  
  // Validate ID format
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return apiResponse(null, 400, 'Invalid visit ID format');
  }
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Fetch the visit from the database
    const visit = await Visit.findById(id)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('provider', 'firstName lastName')
      .lean();
    
    if (!visit) {
      return apiResponse(null, 404, 'Visit not found');
    }
    
    return apiResponse(visit);
  } catch (error: any) {
    console.error(`Error fetching visit ${id}:`, error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return apiResponse(null, 400, 'Invalid visit ID format');
    }
    
    return apiResponse(null, 500, 'Failed to fetch visit: ' + (error.message || 'Unknown error'));
  }
}

// PUT /api/visits/[id] - Update a visit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  
  // Validate ID format
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return apiResponse(null, 400, 'Invalid visit ID format');
  }
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Parse request body with validation
    const body = await request.json().catch(() => ({}));
    
    try {
      // Validate request data
      const validatedData = VisitUpdateSchema.parse(body);
      
      // Update the visit with validated data
      const visit = await Visit.findByIdAndUpdate(
        id,
        { ...validatedData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!visit) {
        return apiResponse(null, 404, 'Visit not found');
      }
      
      return apiResponse(visit);
    } catch (validationError: any) {
      console.error('Visit update validation error:', validationError);
      return apiResponse(null, 400, `Validation error: ${validationError.message || 'Invalid data'}`);
    }
  } catch (error: any) {
    console.error(`Error updating visit ${id}:`, error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return apiResponse(null, 400, 'Invalid visit ID format');
    } else if (error.name === 'ValidationError') {
      return apiResponse(null, 400, `Validation error: ${error.message}`);
    } else if (error.code === 11000) {
      return apiResponse(null, 409, 'Duplicate key error');
    }
    
    return apiResponse(null, 500, 'Failed to update visit: ' + (error.message || 'Unknown error'));
  }
}

// DELETE /api/visits/[id] - Delete a visit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  
  // Validate ID format
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return apiResponse(null, 400, 'Invalid visit ID format');
  }
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Delete the visit
    const result = await Visit.findByIdAndDelete(id);
    
    if (!result) {
      return apiResponse(null, 404, 'Visit not found');
    }
    
    return apiResponse({ message: 'Visit deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting visit ${id}:`, error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return apiResponse(null, 400, 'Invalid visit ID format');
    }
    
    return apiResponse(null, 500, 'Failed to delete visit: ' + (error.message || 'Unknown error'));
  }
} 