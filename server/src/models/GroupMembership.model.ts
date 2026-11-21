import mongoose, { Schema, Document } from 'mongoose';

export type MembershipStatus = 'Active' | 'Removed';
export type ConsentStatus = 'OptedIn' | 'OptedOut' | 'Pending';

export interface IGroupMembership extends Document {
  groupId: mongoose.Types.ObjectId;
  candidateId?: mongoose.Types.ObjectId;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  studentName?: string;
  consentStatus: ConsentStatus;
  consentEvidence?: string;
  membershipStatus: MembershipStatus;
  assignedAt: Date;
  removedAt?: Date;
  assignedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const groupMembershipSchema = new Schema<IGroupMembership>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'VirtualGroup',
      required: [true, 'Group reference is required'],
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: false,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    normalizedPhoneNumber: {
      type: String,
      required: [true, 'Normalized phone number is required'],
      trim: true,
      index: true,
    },
    studentName: {
      type: String,
      trim: true,
      default: '',
    },
    consentStatus: {
      type: String,
      enum: ['OptedIn', 'OptedOut', 'Pending'],
      default: 'OptedIn',
      index: true,
    },
    consentEvidence: {
      type: String,
      default: 'Manual coordinator entry',
    },
    membershipStatus: {
      type: String,
      enum: ['Active', 'Removed'],
      default: 'Active',
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    removedAt: {
      type: Date,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index preventing duplicate phone numbers in the same group
groupMembershipSchema.index({ groupId: 1, normalizedPhoneNumber: 1 }, { unique: true });
groupMembershipSchema.index({ groupId: 1, membershipStatus: 1 });

export const GroupMembership = mongoose.model<IGroupMembership>(
  'GroupMembership',
  groupMembershipSchema
);

export const GroupMember = GroupMembership;
export type IGroupMember = IGroupMembership;

