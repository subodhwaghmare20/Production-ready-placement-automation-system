import mongoose, { Schema, Document } from 'mongoose';

export type AuditModule =
  | 'AUTH'
  | 'CANDIDATES'
  | 'COMPANIES'
  | 'GROUPS'
  | 'CONTACT_FETCHER'
  | 'WHATSAPP'
  | 'REPORTS'
  | 'ADMINS'
  | 'ROLES'
  | 'SETTINGS'
  | 'SESSIONS'
  | 'SYSTEM';

export type AuditOutcome = 'SUCCESS' | 'FAILURE';

export interface IAuditLog extends Document {
  auditId: string;
  actorId?: mongoose.Types.ObjectId;
  actorName: string;
  actorEmail: string;
  action: string;
  module: AuditModule;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: AuditOutcome;
  details?: Record<string, any>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
      sparse: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
      default: 'System',
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: 'system@placement.internal',
    },
    action: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      index: true,
      enum: [
        'AUTH',
        'CANDIDATES',
        'COMPANIES',
        'GROUPS',
        'CONTACT_FETCHER',
        'WHATSAPP',
        'REPORTS',
        'ADMINS',
        'ROLES',
        'SETTINGS',
        'SESSIONS',
        'SYSTEM',
      ],
    },
    targetType: {
      type: String,
      trim: true,
    },
    targetId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    targetName: {
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
    outcome: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only
  }
);

// Compound indexes for fast audit log filtering & export
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
