import mongoose, { Schema, Document } from 'mongoose';

export type SuppressionSource = 'INBOUND_STOP' | 'MANUAL_ADMIN';

export interface IWhatsAppSuppression extends Document {
  phoneNumber: string;
  normalizedPhoneNumber: string;
  optedOutAt: Date;
  source: SuppressionSource;
  reason?: string;
  candidateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppSuppressionSchema = new Schema<IWhatsAppSuppression>(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedPhoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    optedOutAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['INBOUND_STOP', 'MANUAL_ADMIN'],
      default: 'INBOUND_STOP',
    },
    reason: {
      type: String,
      trim: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WhatsAppSuppression = mongoose.model<IWhatsAppSuppression>(
  'WhatsAppSuppression',
  whatsAppSuppressionSchema
);
