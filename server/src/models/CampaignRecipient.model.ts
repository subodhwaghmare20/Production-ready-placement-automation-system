import mongoose, { Schema, Document } from 'mongoose';

export type RecipientStatus =
  | 'PENDING'
  | 'READY'
  | 'CHAT_OPENED'
  | 'SENT_MANUALLY_CONFIRMED'
  | 'SKIPPED'
  | 'FAILED_TO_OPEN';

export type PersonalizationStatus =
  | 'VALID'
  | 'WARNING_MISSING_DATA'
  | 'INVALID_PLACEHOLDERS'
  | 'MANUALLY_EDITED'
  | 'EXCLUDED';

export interface IRecipientAttempt {
  attemptNumber: number;
  action: string;
  status: RecipientStatus;
  timestamp: Date;
  performedBy?: mongoose.Types.ObjectId;
  performedByName?: string;
  notes?: string;
  errorDetails?: string;
}

export interface IProviderWebhookEvent {
  eventType: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
}

export interface ICampaignRecipient extends Document {
  campaignId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  candidateName: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  personalizedMessage: string;
  clickToChatUrl: string;
  status: RecipientStatus;
  queueOrder: number;

  // Module 8 additions
  originalTemplateId?: mongoose.Types.ObjectId;
  originalTemplateContent?: string;
  personalizationStatus: PersonalizationStatus;
  missingFields: string[];
  validationErrors: string[];
  manuallyEdited: boolean;
  isApproved: boolean;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  isExcluded: boolean;
  exclusionReason?: string;

  // Module 9 Tracking Timestamps & Retries
  preparedAt?: Date;
  chatOpenedAt?: Date;
  manuallyConfirmedAt?: Date;
  skippedAt?: Date;
  skipReason?: string;
  lastAttemptAt?: Date;
  lastActionBy?: mongoose.Types.ObjectId;
  lastActionByName?: string;
  errorDetails?: string;
  attemptHistory: IRecipientAttempt[];

  // Module 9 & 10: WhatsApp Cloud API & Delivery Tracking
  provider?: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  providerMessageId?: string;
  providerStatus?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  providerErrorCode?: string;
  providerErrorMessage?: string;
  providerWebhookEvents?: IProviderWebhookEvent[];

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recipientAttemptSchema = new Schema<IRecipientAttempt>(
  {
    attemptNumber: { type: Number, required: true },
    action: { type: String, required: true },
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    performedByName: { type: String, trim: true },
    notes: { type: String, trim: true },
    errorDetails: { type: String, trim: true },
  },
  { _id: false }
);

const providerWebhookEventSchema = new Schema<IProviderWebhookEvent>(
  {
    eventType: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const campaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    personalizedMessage: {
      type: String,
      required: true,
    },
    clickToChatUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'READY',
        'CHAT_OPENED',
        'SENT_MANUALLY_CONFIRMED',
        'SKIPPED',
        'FAILED_TO_OPEN',
      ],
      default: 'READY',
      index: true,
    },
    queueOrder: {
      type: Number,
      required: true,
      index: true,
    },

    // Module 8 fields
    originalTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageTemplate',
    },
    originalTemplateContent: {
      type: String,
    },
    personalizationStatus: {
      type: String,
      enum: [
        'VALID',
        'WARNING_MISSING_DATA',
        'INVALID_PLACEHOLDERS',
        'MANUALLY_EDITED',
        'EXCLUDED',
      ],
      default: 'VALID',
      index: true,
    },
    missingFields: {
      type: [String],
      default: [],
    },
    validationErrors: {
      type: [String],
      default: [],
    },
    manuallyEdited: {
      type: Boolean,
      default: false,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    isExcluded: {
      type: Boolean,
      default: false,
      index: true,
    },
    exclusionReason: {
      type: String,
      trim: true,
    },

    // Module 9 Tracking Fields
    preparedAt: {
      type: Date,
      default: Date.now,
    },
    chatOpenedAt: {
      type: Date,
    },
    manuallyConfirmedAt: {
      type: Date,
    },
    skippedAt: {
      type: Date,
    },
    skipReason: {
      type: String,
      trim: true,
    },
    lastAttemptAt: {
      type: Date,
    },
    lastActionBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    lastActionByName: {
      type: String,
      trim: true,
    },
    errorDetails: {
      type: String,
      trim: true,
    },
    attemptHistory: {
      type: [recipientAttemptSchema],
      default: [],
    },

    // Module 9 & 10: WhatsApp Cloud API & Delivery Tracking
    provider: {
      type: String,
      enum: ['PERSONAL_ASSISTED', 'CLOUD_API'],
      default: 'PERSONAL_ASSISTED',
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    providerStatus: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'READ', 'FAILED'],
      index: true,
      sparse: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    providerErrorCode: {
      type: String,
      trim: true,
    },
    providerErrorMessage: {
      type: String,
      trim: true,
    },
    providerWebhookEvents: {
      type: [providerWebhookEventSchema],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate recipient in the same campaign
campaignRecipientSchema.index({ campaignId: 1, candidateId: 1 }, { unique: true });
campaignRecipientSchema.index({ campaignId: 1, queueOrder: 1 });
campaignRecipientSchema.index({ campaignId: 1, status: 1 });
campaignRecipientSchema.index({ campaignId: 1, personalizationStatus: 1 });
campaignRecipientSchema.index({ campaignId: 1, isApproved: 1, isExcluded: 1 });
campaignRecipientSchema.index({ campaignId: 1, lastAttemptAt: -1 });

export const CampaignRecipient = mongoose.model<ICampaignRecipient>(
  'CampaignRecipient',
  campaignRecipientSchema
);
