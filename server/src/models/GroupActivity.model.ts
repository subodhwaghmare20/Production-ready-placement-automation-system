import mongoose, { Schema, Document } from 'mongoose';

export type GroupActionType =
  | 'GROUP_CREATED'
  | 'CANDIDATE_ADDED'
  | 'CANDIDATE_REMOVED'
  | 'GROUP_UPDATED'
  | 'GROUP_ARCHIVED';

export interface IGroupActivity extends Document {
  groupId: mongoose.Types.ObjectId;
  action: GroupActionType;
  details: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const groupActivitySchema = new Schema<IGroupActivity>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'VirtualGroup',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'GROUP_CREATED',
        'CANDIDATE_ADDED',
        'CANDIDATE_REMOVED',
        'GROUP_UPDATED',
        'GROUP_ARCHIVED',
      ],
      required: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const GroupActivity = mongoose.model<IGroupActivity>('GroupActivity', groupActivitySchema);

