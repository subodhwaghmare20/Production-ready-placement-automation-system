import mongoose, { Schema, Document } from 'mongoose';

export type FetchSourceType = 'EXCEL' | 'CSV' | 'DATABASE' | 'MANUAL_PASTE';

export interface IRejectedRecord {
  identifier: string;
  name?: string;
  phone?: string;
  reason: string;
}

export interface ISkippedRecord {
  candidateId: string;
  fullName: string;
  phone: string;
  reason: string;
}

export interface IAssignedRecord {
  candidateId: string;
  fullName: string;
  phone: string;
  consent: boolean;
}

export interface IFetchOperationHistory extends Document {
  operationId: string;
  adminId?: mongoose.Types.ObjectId;
  adminName: string;
  sourceType: FetchSourceType;
  companyId?: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  companyName?: string;
  groupName?: string;
  totalProcessed: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  existingCandidates: number;
  unknownNumbers: number;
  successfulAssignments: number;
  alreadyAssigned: number;
  withoutConsent: number;
  failedAssignments: number;
  reportData: {
    rejected: IRejectedRecord[];
    skipped: ISkippedRecord[];
    assigned: IAssignedRecord[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const FetchOperationHistorySchema = new Schema<IFetchOperationHistory>(
  {
    operationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    adminName: {
      type: String,
      required: true,
      default: 'Placement Admin',
    },
    sourceType: {
      type: String,
      required: true,
      enum: ['EXCEL', 'CSV', 'DATABASE', 'MANUAL_PASTE'],
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'VirtualGroup',
    },
    companyName: {
      type: String,
      trim: true,
    },
    groupName: {
      type: String,
      trim: true,
    },
    totalProcessed: {
      type: Number,
      default: 0,
    },
    validRecords: {
      type: Number,
      default: 0,
    },
    invalidRecords: {
      type: Number,
      default: 0,
    },
    duplicateRecords: {
      type: Number,
      default: 0,
    },
    existingCandidates: {
      type: Number,
      default: 0,
    },
    unknownNumbers: {
      type: Number,
      default: 0,
    },
    successfulAssignments: {
      type: Number,
      default: 0,
    },
    alreadyAssigned: {
      type: Number,
      default: 0,
    },
    withoutConsent: {
      type: Number,
      default: 0,
    },
    failedAssignments: {
      type: Number,
      default: 0,
    },
    reportData: {
      rejected: [
        {
          identifier: { type: String, default: '' },
          name: { type: String, default: '' },
          phone: { type: String, default: '' },
          reason: { type: String, default: '' },
        },
      ],
      skipped: [
        {
          candidateId: { type: String, default: '' },
          fullName: { type: String, default: '' },
          phone: { type: String, default: '' },
          reason: { type: String, default: '' },
        },
      ],
      assigned: [
        {
          candidateId: { type: String, default: '' },
          fullName: { type: String, default: '' },
          phone: { type: String, default: '' },
          consent: { type: Boolean, default: false },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const FetchOperationHistory = mongoose.model<IFetchOperationHistory>(
  'FetchOperationHistory',
  FetchOperationHistorySchema
);

