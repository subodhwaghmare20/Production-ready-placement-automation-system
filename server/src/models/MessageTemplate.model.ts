import mongoose, { Schema, Document } from 'mongoose';

export type TemplateCategory =
  | 'JOB_OPPORTUNITY'
  | 'PLACEMENT_OPPORTUNITY'
  | 'INTERVIEW_INVITATION'
  | 'INTERVIEW_REMINDER'
  | 'SHORTLISTED'
  | 'SELECTED_NOTIFICATION'
  | 'REJECTED'
  | 'REJECTION_NOTIFICATION'
  | 'PLACEMENT_CONFIRMATION'
  | 'DOCUMENT_REQUEST'
  | 'DOCUMENT_SUBMISSION'
  | 'GENERAL_ANNOUNCEMENT'
  | 'CUSTOM'
  | 'TECHNICAL_ASSESSMENT';

export type TemplateStatus = 'Active' | 'Inactive' | 'Draft';

export interface IMessageTemplate extends Document {
  templateId: string;
  name: string;
  subject?: string;
  category: TemplateCategory;
  description?: string;
  content: string;
  placeholders: string[];
  language: string;
  status: TemplateStatus;
  isPredefined: boolean;
  isActive: boolean;
  usageCount: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [150, 'Template name cannot exceed 150 characters'],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'JOB_OPPORTUNITY',
        'PLACEMENT_OPPORTUNITY',
        'INTERVIEW_INVITATION',
        'INTERVIEW_REMINDER',
        'SHORTLISTED',
        'SELECTED_NOTIFICATION',
        'REJECTED',
        'REJECTION_NOTIFICATION',
        'PLACEMENT_CONFIRMATION',
        'DOCUMENT_REQUEST',
        'DOCUMENT_SUBMISSION',
        'GENERAL_ANNOUNCEMENT',
        'CUSTOM',
        'TECHNICAL_ASSESSMENT',
      ],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [4096, 'Message content cannot exceed 4096 characters'],
    },
    placeholders: {
      type: [String],
      default: [],
    },
    language: {
      type: String,
      default: 'English',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Draft'],
      default: 'Active',
      index: true,
    },
    isPredefined: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for templateName and messageBody
messageTemplateSchema.virtual('templateName').get(function () {
  return this.name;
});
messageTemplateSchema.virtual('messageBody').get(function () {
  return this.content;
});

// Auto-extract placeholders and sync isActive with status before saving
messageTemplateSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    const matches = this.content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (matches) {
      const extracted = Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim())));
      this.placeholders = extracted;
    } else {
      this.placeholders = [];
    }
  }

  if (this.isModified('status')) {
    this.isActive = this.status === 'Active';
  } else if (this.isModified('isActive')) {
    this.status = this.isActive ? 'Active' : 'Inactive';
  }

  next();
});

export const MessageTemplate = mongoose.model<IMessageTemplate>(
  'MessageTemplate',
  messageTemplateSchema
);
