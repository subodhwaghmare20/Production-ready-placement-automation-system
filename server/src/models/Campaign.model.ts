import mongoose, { Schema, Document } from 'mongoose';

export type CampaignStatus =
  | 'DRAFT'
  | 'PREPARING'
  | 'READY'
  | 'PREPARED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ICampaignMetrics {
  totalRecipients: number;
  eligibleRecipients: number;
  excludedNoConsent: number;
  excludedInvalidPhone: number;
  processedRecipients: number;
  chatOpenedCount: number;
  manuallyConfirmedCount: number;
  skippedCount: number;
  failedCount: number;
  // Module 8 additions
  validCount: number;
  warningCount: number;
  manuallyEditedCount: number;
  approvedCount: number;
  excludedCount: number;
}

export interface ICampaignMetadata {
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewMode?: string;
  customJobRole?: string;
  adminName?: string;
  adminContact?: string;
  notes?: string;
}

export interface ICampaign extends Document {
  campaignId: string;
  name: string;
  companyId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  metaTemplateId?: mongoose.Types.ObjectId;
  metaTemplateName?: string;
  messageType?: 'TEMPLATE' | 'TEXT';
  messageTemplateContent: string;
  provider: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  status: CampaignStatus;
  metrics: ICampaignMetrics;
  metadata: ICampaignMetadata;
  currentRecipientIndex: number;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [150, 'Campaign name cannot exceed 150 characters'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Target company is required'],
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'VirtualGroup',
      required: [true, 'Target virtual group is required'],
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageTemplate',
    },
    metaTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'MetaTemplate',
    },
    metaTemplateName: {
      type: String,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['TEMPLATE', 'TEXT'],
      default: 'TEMPLATE',
    },
    messageTemplateContent: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [4096, 'Message content cannot exceed 4096 characters'],
    },
    provider: {
      type: String,
      enum: ['PERSONAL_ASSISTED', 'CLOUD_API'],
      default: 'PERSONAL_ASSISTED',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PREPARING',
        'READY',
        'PREPARED',
        'IN_PROGRESS',
        'PAUSED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'PREPARED',
      index: true,
    },
    metrics: {
      totalRecipients: { type: Number, default: 0 },
      eligibleRecipients: { type: Number, default: 0 },
      excludedNoConsent: { type: Number, default: 0 },
      excludedInvalidPhone: { type: Number, default: 0 },
      processedRecipients: { type: Number, default: 0 },
      chatOpenedCount: { type: Number, default: 0 },
      manuallyConfirmedCount: { type: Number, default: 0 },
      skippedCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      validCount: { type: Number, default: 0 },
      warningCount: { type: Number, default: 0 },
      manuallyEditedCount: { type: Number, default: 0 },
      approvedCount: { type: Number, default: 0 },
      excludedCount: { type: Number, default: 0 },
    },
    metadata: {
      interviewDate: { type: String, trim: true },
      interviewTime: { type: String, trim: true },
      interviewLocation: { type: String, trim: true },
      interviewMode: { type: String, trim: true },
      customJobRole: { type: String, trim: true },
      adminName: { type: String, trim: true },
      adminContact: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    currentRecipientIndex: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
export const MessageCampaign = Campaign;
export type IMessageCampaign = ICampaign;
