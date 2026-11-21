import mongoose, { Schema, Document } from 'mongoose';

export type MembershipStatus = 'Active' | 'Removed';

export interface IGroupMembership extends Document {
  groupId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
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
      required: [true, 'Candidate reference is required'],
      index: true,
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

// Compound unique index so a candidate cannot appear twice in the same group
groupMembershipSchema.index({ groupId: 1, candidateId: 1 }, { unique: true });

export const GroupMembership = mongoose.model<IGroupMembership>(
  'GroupMembership',
  groupMembershipSchema
);

