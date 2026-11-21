import mongoose, { Schema, Document } from 'mongoose';

export type NotificationCategory =
  | 'CAMPAIGN_COMPLETED'
  | 'CAMPAIGN_FAILED'
  | 'SECURITY_LOCKOUT'
  | 'SYSTEM_ALERT'
  | 'IMPORT_COMPLETED';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface INotification extends Document {
  notificationId: string;
  recipientAdminId?: mongoose.Types.ObjectId;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    recipientAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
      sparse: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ['CAMPAIGN_COMPLETED', 'CAMPAIGN_FAILED', 'SECURITY_LOCKOUT', 'SYSTEM_ALERT', 'IMPORT_COMPLETED'],
      default: 'SYSTEM_ALERT',
      index: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'],
      default: 'INFO',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
