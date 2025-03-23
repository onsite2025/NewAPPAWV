import mongoose from 'mongoose';

export interface IResponse {
  questionId: string;
  value: string | number | boolean | string[];
}

export interface IVisit {
  patient: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  template: mongoose.Types.ObjectId;
  scheduledDate: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  responses: {
    sectionId: string;
    answers: IResponse[];
  }[];
  healthPlan?: {
    recommendations: {
      domain: string;
      text: string;
      priority: 'high' | 'medium' | 'low';
    }[];
    summary?: string;
  };
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResponseSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, { _id: false });

const SectionResponseSchema = new mongoose.Schema({
  sectionId: {
    type: String,
    required: true,
  },
  answers: [ResponseSchema],
}, { _id: false });

const RecommendationSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
}, { _id: false });

const HealthPlanSchema = new mongoose.Schema({
  recommendations: [RecommendationSchema],
  summary: String,
}, { _id: false });

const VisitSchema = new mongoose.Schema<IVisit>(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    responses: [SectionResponseSchema],
    healthPlan: HealthPlanSchema,
    notes: String,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
VisitSchema.index({ patient: 1, scheduledDate: -1 });
VisitSchema.index({ provider: 1, scheduledDate: -1 });
VisitSchema.index({ status: 1, scheduledDate: 1 });
VisitSchema.index({ scheduledDate: 1 });

export default mongoose.models.Visit || mongoose.model<IVisit>('Visit', VisitSchema); 