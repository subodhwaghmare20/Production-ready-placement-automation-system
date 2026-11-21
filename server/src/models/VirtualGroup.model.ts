import mongoose, { Schema, Document } from 'mongoose';

export type GroupStatus = 'Active' | 'Archived' | 'Completed';

export interface IVirtualGroup extends Document {
  groupId: string;
  groupName: string;
  description?: string;
  companyId: mongoose.Types.ObjectId;
  memberCount: number;
  status: GroupStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const virtualGroupSchema = new Schema<IVirtualGroup>(
  {
    groupId: {
      type: String,
      required: [true, 'Group ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    groupName: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [150, 'Group name cannot exceed 150 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      unique: true, // One primary virtual group per company rule
      index: true,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Archived', 'Completed'],
      default: 'Active',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

virtualGroupSchema.index({ groupName: 'text', description: 'text', groupId: 'text' });

export const VirtualGroup = mongoose.model<IVirtualGroup>('VirtualGroup', virtualGroupSchema);
