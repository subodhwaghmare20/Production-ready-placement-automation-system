import mongoose, { Schema, Document } from 'mongoose';

export type InboundMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'button'
  | 'interactive'
  | 'location'
  | 'unknown';

export type InboundProcessingStatus = 'UNREAD' | 'READ' | 'RESOLVED';

export interface IWhatsAppInboundMessage extends Document {
  providerMessageId: string;
  senderPhoneNumber: string;
  normalizedSenderPhoneNumber: string;
  senderName?: string;
  messageType: InboundMessageType;
  textBody?: string;
  mediaMetadata?: {
    mimeType?: string;
    sha256?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
  rawPayload: Record<string, any>;
  receivedAt: Date;
  linkedCandidateId?: mongoose.Types.ObjectId;
  linkedCampaignId?: mongoose.Types.ObjectId;
  processingStatus: InboundProcessingStatus;
  isOptOutRequest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppInboundMessageSchema = new Schema<IWhatsAppInboundMessage>(
  {
    providerMessageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedSenderPhoneNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'audio', 'video', 'button', 'interactive', 'location', 'unknown'],
      default: 'text',
    },
    textBody: {
      type: String,
      trim: true,
    },
    mediaMetadata: {
      type: Schema.Types.Mixed,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    linkedCandidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      index: true,
      sparse: true,
    },
    linkedCampaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true,
      sparse: true,
    },
    processingStatus: {
      type: String,
      enum: ['UNREAD', 'READ', 'RESOLVED'],
      default: 'UNREAD',
      index: true,
    },
    isOptOutRequest: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WhatsAppInboundMessage = mongoose.model<IWhatsAppInboundMessage>(
  'WhatsAppInboundMessage',
  whatsAppInboundMessageSchema
);
