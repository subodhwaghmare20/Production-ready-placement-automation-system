import mongoose, { Schema, Document } from 'mongoose';

export type WhatsAppCloudConnectionStatus =
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'FAILED'
  | 'TEST_MODE';

export interface IWhatsAppCloudConfig extends Document {
  appId?: string;
  encryptedAppSecret?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  encryptedAccessToken?: string;
  encryptedVerifyToken?: string;
  graphApiVersion: string;
  connectionStatus: WhatsAppCloudConnectionStatus;
  isMockMode: boolean;
  lastVerifiedAt?: Date;
  lastError?: string;
  webhookCallbackUrl?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppCloudConfigSchema = new Schema<IWhatsAppCloudConfig>(
  {
    appId: {
      type: String,
      trim: true,
    },
    encryptedAppSecret: {
      type: String,
      trim: true,
    },
    wabaId: {
      type: String,
      trim: true,
    },
    phoneNumberId: {
      type: String,
      trim: true,
    },
    displayPhoneNumber: {
      type: String,
      trim: true,
    },
    verifiedName: {
      type: String,
      trim: true,
    },
    qualityRating: {
      type: String,
      default: 'GREEN',
    },
    encryptedAccessToken: {
      type: String,
      trim: true,
    },
    encryptedVerifyToken: {
      type: String,
      trim: true,
    },
    graphApiVersion: {
      type: String,
      default: 'v21.0',
    },
    connectionStatus: {
      type: String,
      enum: ['NOT_CONFIGURED', 'CONNECTED', 'FAILED', 'TEST_MODE'],
      default: 'NOT_CONFIGURED',
    },
    isMockMode: {
      type: Boolean,
      default: true,
    },
    lastVerifiedAt: {
      type: Date,
    },
    lastError: {
      type: String,
      trim: true,
    },
    webhookCallbackUrl: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export const WhatsAppCloudConfig = mongoose.model<IWhatsAppCloudConfig>(
  'WhatsAppCloudConfig',
  whatsAppCloudConfigSchema
);
export const WhatsAppConnection = WhatsAppCloudConfig;
export type IWhatsAppConnection = IWhatsAppCloudConfig;
