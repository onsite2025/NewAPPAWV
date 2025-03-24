import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Use the same Patient model from the main patients route
const PatientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  gender: { type: String, required: true },
  email: String,
  phoneNumber: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
  },
  medicalHistory: {
    conditions: [String],
    medications: [String],
    allergies: [String],
    surgeries: [String],
  },
}, { 
  timestamps: true 
});

// Get the Patient model (create if it doesn't exist)
const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);

// GET: Retrieve a specific patient
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const id = context.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 });
    }
    
    const patient = await Patient.findById(id).lean();
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    return NextResponse.json(patient);
  } catch (error) {
    console.error(`Error fetching patient ${context.params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

// PUT: Update a patient
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const id = context.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.firstName || !body.lastName || !body.dateOfBirth || !body.gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find and update the patient
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error(`Error updating patient ${context.params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a patient
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const id = context.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 });
    }
    
    // Find and delete the patient
    const deletedPatient = await Patient.findByIdAndDelete(id);
    
    if (!deletedPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { message: 'Patient deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting patient ${context.params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
} 