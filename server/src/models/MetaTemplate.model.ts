import mongoose, { Schema, Document } from 'mongoose';

export type MetaTemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED'
  | 'UNKNOWN';

export type MetaTemplateCategory =
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION';

export interface IMetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export interface IMetaTemplateParameterMapping {
  index: number;
  parameterName: string;
  candidateField: string;
}

export interface IMetaTemplate extends Document {
  metaTemplateId: string;
  name: string;
  language: string;
  category: MetaTemplateCategory;
  status: MetaTemplateStatus;
  components: IMetaTemplateComponent[];
  parameterMappings: IMetaTemplateParameterMapping[];
  rawTemplate?: any;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const metaTemplateSchema = new Schema<IMetaTemplate>(
  {
    metaTemplateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      default: 'en_US',
    },
    category: {
      type: String,
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      default: 'UTILITY',
    },
    status: {
      type: String,
      enum: ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED', 'UNKNOWN'],
      default: 'APPROVED',
      index: true,
    },
    components: [
      {
        type: {
          type: String,
          enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
          required: true,
        },
        format: {
          type: String,
          enum: ['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'],
        },
        text: String,
        buttons: [Schema.Types.Mixed],
      },
    ],
    parameterMappings: [
      {
        index: Number,
        parameterName: String,
        candidateField: String,
      },
    ],
    rawTemplate: {
      type: Schema.Types.Mixed,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

metaTemplateSchema.index({ name: 1, language: 1 });

export const MetaTemplate = mongoose.model<IMetaTemplate>(
  'MetaTemplate',
  metaTemplateSchema
);
