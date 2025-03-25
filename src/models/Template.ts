import mongoose, { Schema, Document, model, Model } from 'mongoose';

export interface IOption {
  value: string;
  label: string;
}

export interface IQuestion {
  id: string;
  text: string;
  type: 'text' | 'multipleChoice' | 'numeric' | 'date' | 'boolean';
  required: boolean;
  options?: IOption[];
  conditionalLogic?: {
    dependsOn: string;
    showWhen: {
      value: string | number | boolean;
      operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan';
    };
  };
}

export interface ISection {
  id: string;
  title: string;
  description?: string;
  questions: IQuestion[];
}

// Base template interface without MongoDB specific fields
export interface ITemplateBase {
  name: string;
  description?: string;
  sections: ISection[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Interface for MongoDB document
export interface ITemplate extends ITemplateBase, Document {}

// Interface for API responses with optional _id and id fields
export interface ITemplateResponse extends ITemplateBase {
  _id?: string;
  id?: string;
}

// Define the schema for options
const OptionSchema = new Schema<IOption>({
  value: { type: String, required: true },
  label: { type: String, required: true }
}, { _id: false });

// Define the schema for conditional logic
const ConditionalLogicSchema = new Schema({
  dependsOn: { type: String, required: true },
  showWhen: {
    value: { type: Schema.Types.Mixed, required: true },
    operator: { 
      type: String, 
      enum: ['equals', 'notEquals', 'greaterThan', 'lessThan'],
      default: 'equals'
    }
  }
}, { _id: false });

// Define the schema for questions
const QuestionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'multipleChoice', 'numeric', 'date', 'boolean'],
    required: true 
  },
  required: { type: Boolean, default: false },
  options: [OptionSchema],
  conditionalLogic: ConditionalLogicSchema
}, { _id: false });

// Define the schema for sections
const SectionSchema = new Schema<ISection>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  questions: [QuestionSchema]
}, { _id: false });

// Define the main template schema
const TemplateSchema = new Schema<ITemplate>({
  name: { type: String, required: true },
  description: String,
  sections: [SectionSchema],
  isActive: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  version: { type: Number, default: 1 }
}, { 
  timestamps: true,
  versionKey: false,
  collection: 'templates' // Explicitly set collection name
});

// Add any pre-save middleware if needed
TemplateSchema.pre('save', function(next) {
  if (!this.version) {
    this.version = 1;
  }
  next();
});

// Define the model type
export type TemplateModel = Model<ITemplate>;

// Create and export the model
const TemplateModel = (mongoose.models.Template as TemplateModel) || model<ITemplate>('Template', TemplateSchema);

export default TemplateModel; 