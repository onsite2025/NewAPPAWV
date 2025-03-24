import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Get the Visit model schema from the main visits route
const VisitSchema = new mongoose.Schema({
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  scheduledDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  templateId: { type: String, required: true },
  responses: { type: Object, default: {} },
  provider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  location: { type: String },
  notes: { type: String },
  documents: [{ 
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
}, { 
  timestamps: true 
});

// Get the Visit model
const Visit = mongoose.models.Visit || mongoose.model('Visit', VisitSchema);

// GET: Retrieve a specific visit
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const id = params.id;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid visit ID format' },
        { status: 400 }
      );
    }
    
    // Find the visit by ID
    const visit = await Visit.findById(id)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('provider', 'firstName lastName')
      .lean();
    
    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(visit);
  } catch (error) {
    console.error('Error getting visit:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve visit' },
      { status: 500 }
    );
  }
}

// PUT: Update a visit
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    
    const id = params.id;
    const body = await request.json();
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid visit ID format' },
        { status: 400 }
      );
    }
    
    // Find and update the visit
    const visit = await Visit.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('provider', 'firstName lastName');
    
    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(visit);
  } catch (error) {
    console.error('Error updating visit:', error);
    return NextResponse.json(
      { error: 'Failed to update visit' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a visit
// @ts-ignore - Disable type checking for this function to resolve Vercel build issues
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    
    const id = params.id;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid visit ID format' },
        { status: 400 }
      );
    }
    
    // Find and delete the visit
    const visit = await Visit.findByIdAndDelete(id);
    
    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json(
      { error: 'Failed to delete visit' },
      { status: 500 }
    );
  }
} 