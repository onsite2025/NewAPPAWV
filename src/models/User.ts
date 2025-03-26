import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the interface for User document
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'provider' | 'staff';
  profileImage?: string;
  specialty?: string;
  npiNumber?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Define the User schema
const UserSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true, 
    select: false
  },
  role: { 
    type: String, 
    enum: ['admin', 'provider', 'staff'], 
    default: 'staff' 
  },
  profileImage: String,
  specialty: String,
  npiNumber: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { 
  timestamps: true 
});

// Hash password before saving
UserSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Use a function to create the model to prevent "OverwriteModelError"
const getUserModel = (): Model<IUser> => {
  // Check if the model already exists to prevent overwriting
  return mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
};

// Export a function that safely returns the User model
export default getUserModel(); 