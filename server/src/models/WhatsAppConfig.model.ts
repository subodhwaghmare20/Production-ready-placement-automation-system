import mongoose, { Schema, Document } from 'mongoose';

export type WhatsAppMode = 'PERSONAL_ASSISTED' | 'CLOUD_API';

export interface IPersonalWhatsAppConfig {
  accountType: 'PERSONAL';
  senderPhone?: string;
  webUrlPrefix: string;
  autoAdvanceOnSent: boolean;
  safetyDelaySeconds: number;
}

export interface ICloudApiConfig {
  isEnabled: boolean;
  metaBusinessAccountId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  apiVersion: string;
  isVerified: boolean;
}

export interface IWhatsAppConfig extends Document {
  mode: WhatsAppMode;
  personal: IPersonalWhatsAppConfig;
  cloudApi: ICloudApiConfig;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppConfigSchema = new Schema<IWhatsAppConfig>(
  {
    mode: {
      type: String,
      enum: ['PERSONAL_ASSISTED', 'CLOUD_API'],
      default: 'PERSONAL_ASSISTED',
      required: true,
    },
    personal: {
      accountType: {
        type: String,
        default: 'PERSONAL',
        enum: ['PERSONAL'],
      },
      senderPhone: {
        type: String,
        trim: true,
      },
      webUrlPrefix: {
        type: String,
        default: 'https://wa.me',
      },
      autoAdvanceOnSent: {
        type: Boolean,
        default: true,
      },
      safetyDelaySeconds: {
        type: Number,
        default: 3,
        min: 0,
        max: 60,
      },
    },
    cloudApi: {
      isEnabled: {
        type: Boolean,
        default: false,
      },
      metaBusinessAccountId: {
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
      accessToken: {
        type: String,
        trim: true,
      },
      webhookVerifyToken: {
        type: String,
        trim: true,
      },
      apiVersion: {
        type: String,
        default: 'v20.0',
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
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

export const WhatsAppConfig = mongoose.model<IWhatsAppConfig>(
  'WhatsAppConfig',
  whatsAppConfigSchema
);

