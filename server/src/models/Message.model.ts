import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  recipientPhone: string;
  candidateId?: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  content: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    recipientPhone: { type: String, required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' },
    templateId: { type: Schema.Types.ObjectId },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', messageSchema);

