import mongoose from 'mongoose';

export interface IPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  medicalRecordNumber?: string;
  insuranceInfo?: {
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
  };
  primaryCareProvider?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new mongoose.Schema<IPatient>(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide a first name'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide a last name'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Please provide a date of birth'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Please specify gender'],
    },
    email: {
      type: String,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    medicalRecordNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
    },
    primaryCareProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

PatientSchema.index({ lastName: 1, firstName: 1 });
PatientSchema.index({ dateOfBirth: 1 });
PatientSchema.index({ medicalRecordNumber: 1 }, { sparse: true });

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema); 