import mongoose, { Schema, Document } from 'mongoose';

export type ExperienceType = 'Fresher' | 'Experienced';
export type PlacementStatus = 'Available' | 'Placed' | 'Inactive';

export interface ICandidate extends Document {
  candidateId: string;
  fullName: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  email?: string;
  gender?: string;
  collegeName?: string;
  degree?: string;
  branch?: string;
  passingYear?: number;
  skills: string[];
  experienceType: ExperienceType;
  experienceYears?: number;
  resumeUrl?: string;
  resumeOriginalName?: string;
  resumeMimeType?: string;
  resumeFileSize?: number;
  placementStatus: PlacementStatus;
  whatsappConsent: boolean;
  whatsappConsentAt?: Date;
  whatsappConsentSource?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    candidateId: {
      type: String,
      required: [true, 'Candidate ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [150, 'Full name cannot exceed 150 characters'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    normalizedPhoneNumber: {
      type: String,
      required: [true, 'Normalized phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say', ''],
      default: '',
    },
    collegeName: {
      type: String,
      trim: true,
      default: '',
    },
    degree: {
      type: String,
      trim: true,
      default: '',
    },
    branch: {
      type: String,
      trim: true,
      default: '',
    },
    passingYear: {
      type: Number,
      min: [1990, 'Passing year cannot be earlier than 1990'],
      max: [2035, 'Passing year cannot be later than 2035'],
    },
    skills: {
      type: [String],
      default: [],
    },
    experienceType: {
      type: String,
      enum: ['Fresher', 'Experienced'],
      default: 'Fresher',
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    resumeUrl: {
      type: String,
      trim: true,
    },
    resumeOriginalName: {
      type: String,
      trim: true,
    },
    resumeMimeType: {
      type: String,
      trim: true,
    },
    resumeFileSize: {
      type: Number,
    },
    placementStatus: {
      type: String,
      enum: ['Available', 'Placed', 'Inactive'],
      default: 'Available',
      index: true,
    },
    whatsappConsent: {
      type: Boolean,
      default: false,
      index: true,
    },
    whatsappConsentAt: {
      type: Date,
    },
    whatsappConsentSource: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound text search index for fast querying across name, email, phone, and skills
candidateSchema.index({
  fullName: 'text',
  email: 'text',
  phoneNumber: 'text',
  candidateId: 'text',
});

export const Candidate = mongoose.model<ICandidate>('Candidate', candidateSchema);
