import mongoose, { Schema, Document } from 'mongoose';

export type CampaignEventType =
  | 'CAMPAIGN_CREATED'
  | 'RECIPIENTS_PREPARED'
  | 'PERSONALIZATION_COMPLETED'
  | 'CAMPAIGN_STARTED'
  | 'CHAT_OPENED'
  | 'MESSAGE_MANUALLY_CONFIRMED'
  | 'RECIPIENT_SKIPPED'
  | 'CHAT_OPENING_FAILED'
  | 'CAMPAIGN_PAUSED'
  | 'CAMPAIGN_RESUMED'
  | 'CAMPAIGN_COMPLETED'
  | 'CAMPAIGN_CANCELLED'
  | 'RECIPIENT_OVERRIDE'
  | 'RECIPIENT_APPROVED'
  | 'RECIPIENT_EXCLUDED';

export interface ICampaignActivity extends Document {
  campaignId: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId;
  candidateName?: string;
  eventType: CampaignEventType;
  description: string;
  performedBy?: mongoose.Types.ObjectId;
  performedByName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const campaignActivitySchema = new Schema<ICampaignActivity>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignRecipient',
      index: true,
    },
    candidateName: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      enum: [
        'CAMPAIGN_CREATED',
        'RECIPIENTS_PREPARED',
        'PERSONALIZATION_COMPLETED',
        'CAMPAIGN_STARTED',
        'CHAT_OPENED',
        'MESSAGE_MANUALLY_CONFIRMED',
        'RECIPIENT_SKIPPED',
        'CHAT_OPENING_FAILED',
        'CAMPAIGN_PAUSED',
        'CAMPAIGN_RESUMED',
        'CAMPAIGN_COMPLETED',
        'CAMPAIGN_CANCELLED',
        'RECIPIENT_OVERRIDE',
        'RECIPIENT_APPROVED',
        'RECIPIENT_EXCLUDED',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    performedByName: {
      type: String,
      trim: true,
      default: 'Administrator',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for timeline performance and deduplication
campaignActivitySchema.index({ campaignId: 1, timestamp: -1 });
campaignActivitySchema.index({ campaignId: 1, eventType: 1, timestamp: -1 });
campaignActivitySchema.index({ campaignId: 1, recipientId: 1, eventType: 1 });

export const CampaignActivity = mongoose.model<ICampaignActivity>(
  'CampaignActivity',
  campaignActivitySchema
);
