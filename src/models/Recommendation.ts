import mongoose from 'mongoose';

export interface IRecommendation {
  text: string;
  domain: string;
  priority: 'high' | 'medium' | 'low';
  condition?: string;
  tags?: string[];
  isCustom: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationSchema = new mongoose.Schema<IRecommendation>(
  {
    text: {
      type: String,
      required: [true, 'Please provide recommendation text'],
      trim: true,
    },
    domain: {
      type: String,
      required: [true, 'Please provide a health domain'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    condition: {
      type: String,
      trim: true,
    },
    tags: [String],
    isCustom: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
RecommendationSchema.index({ domain: 1 });
RecommendationSchema.index({ tags: 1 });
RecommendationSchema.index({ isCustom: 1, createdBy: 1 });

export default mongoose.models.Recommendation || 
  mongoose.model<IRecommendation>('Recommendation', RecommendationSchema); 