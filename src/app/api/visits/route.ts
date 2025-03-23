import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Define Visit schema
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

// Get the Visit model (create if it doesn't exist)
const Visit = mongoose.models.Visit || mongoose.model('Visit', VisitSchema);

// GET /api/visits - Fetch visits with pagination
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const patientId = searchParams.get('patientId') || null;
    const status = searchParams.get('status') || null;
    const fromDate = searchParams.get('fromDate') || null;
    const toDate = searchParams.get('toDate') || null;
    const sortField = searchParams.get('sortField') || 'scheduledDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query
    const query: any = {};
    
    if (patientId) {
      query.patient = patientId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (fromDate || toDate) {
      query.scheduledDate = {};
      if (fromDate) {
        query.scheduledDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.scheduledDate.$lte = new Date(toDate);
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort: any = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
    
    // Fetch visits from the database
    const visits = await Visit.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('provider', 'name')
      .lean();
    
    // Get total count
    const total = await Visit.countDocuments(query);
    
    return NextResponse.json({
      visits,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}

// POST /api/visits - Create a new visit
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.patient || !body.scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields (patient and scheduledDate are required)' },
        { status: 400 }
      );
    }
    
    // Check if patient exists
    if (!mongoose.Types.ObjectId.isValid(body.patient)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }
    
    // Create new visit
    const visit = new Visit(body);
    await visit.save();
    
    // Populate patient and provider info
    await visit.populate('patient', 'firstName lastName');
    await visit.populate('provider', 'name');
    
    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error('Error creating visit:', error);
    return NextResponse.json(
      { error: 'Failed to create visit' },
      { status: 500 }
    );
  }
} 