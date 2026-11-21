import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminSession extends Document {
  sessionId: string;
  adminId: mongoose.Types.ObjectId;
  tokenHash?: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  lastActive: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSessionSchema = new Schema<IAdminSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    browser: {
      type: String,
      trim: true,
      default: 'Unknown Browser',
    },
    os: {
      type: String,
      trim: true,
      default: 'Unknown OS',
    },
    device: {
      type: String,
      trim: true,
      default: 'Desktop',
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    revocationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

adminSessionSchema.index({ adminId: 1, isRevoked: 1 });

export const AdminSession = mongoose.model<IAdminSession>(
  'AdminSession',
  adminSessionSchema
);
