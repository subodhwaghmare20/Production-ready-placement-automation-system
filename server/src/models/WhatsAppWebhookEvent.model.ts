import mongoose, { Schema, Document } from 'mongoose';

export type WebhookProcessingStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';

export interface IWhatsAppWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  provider: string;
  providerMessageId?: string;
  payload: Record<string, any>;
  signatureVerified: boolean;
  processingStatus: WebhookProcessingStatus;
  receivedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppWebhookEventSchema = new Schema<IWhatsAppWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'CLOUD_API',
      index: true,
    },
    providerMessageId: {
      type: String,
      index: true,
      sparse: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED', 'IGNORED'],
      default: 'PENDING',
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const WhatsAppWebhookEvent = mongoose.model<IWhatsAppWebhookEvent>(
  'WhatsAppWebhookEvent',
  whatsAppWebhookEventSchema
);
