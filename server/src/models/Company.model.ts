import mongoose, { Schema, Document } from 'mongoose';

export type WorkMode = 'Office' | 'Hybrid' | 'Remote';
export type InterviewMode = 'Online' | 'Offline';
export type RecruitmentStatus = 'Active' | 'On Hold' | 'Closed' | 'Completed';
export type CompanyExperienceType = 'Fresher' | 'Experienced';

export interface ICompany extends Document {
  companyId: string;
  companyName: string;
  industry?: string;
  website?: string;
  companyDescription?: string;

  // HR Contact
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;

  // Job Opening
  jobRole: string;
  jobDescription?: string;
  requiredCandidates: number;
  requiredSkills: string[];
  eligibleBranches: string[];
  eligibleDegrees: string[];
  eligiblePassingYears: number[];
  experienceType: CompanyExperienceType;
  minimumExperience?: number;
  maximumExperience?: number;
  minimumCGPA?: number;
  maximumBacklogs?: number;

  // Compensation & Location
  salaryPackage?: string;
  jobLocation?: string;
  workMode: WorkMode;

  // Recruitment Schedule
  applicationDeadline?: Date;
  interviewDate?: Date;
  interviewMode: InterviewMode;
  interviewLocation?: string;
  recruitmentStatus: RecruitmentStatus;

  // Additional
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    companyId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
      default: () => 'COMP-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase(),
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
      index: true,
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    companyDescription: {
      type: String,
      trim: true,
      maxlength: [2000, 'Company description cannot exceed 2000 characters'],
      default: '',
    },

    // HR Contact Information
    hrName: {
      type: String,
      trim: true,
      default: '',
    },
    hrEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    hrPhone: {
      type: String,
      trim: true,
      default: '',
    },

    // Job Information
    jobRole: {
      type: String,
      trim: true,
      maxlength: [150, 'Job role cannot exceed 150 characters'],
      default: 'General',
    },
    jobDescription: {
      type: String,
      trim: true,
      maxlength: [3000, 'Job description cannot exceed 3000 characters'],
      default: '',
    },
    requiredCandidates: {
      type: Number,
      min: [1, 'Must require at least 1 candidate'],
      default: 1,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    eligibleBranches: {
      type: [String],
      default: [],
    },
    eligibleDegrees: {
      type: [String],
      default: [],
    },
    eligiblePassingYears: {
      type: [Number],
      default: [],
    },
    experienceType: {
      type: String,
      enum: ['Fresher', 'Experienced'],
      default: 'Fresher',
    },
    minimumExperience: {
      type: Number,
      min: [0, 'Minimum experience cannot be negative'],
      default: 0,
    },
    maximumExperience: {
      type: Number,
      min: [0, 'Maximum experience cannot be negative'],
    },
    minimumCGPA: {
      type: Number,
      min: [0, 'Minimum CGPA cannot be negative'],
      max: [10, 'Minimum CGPA cannot exceed 10.0'],
    },
    maximumBacklogs: {
      type: Number,
      min: [0, 'Backlogs cannot be negative'],
      default: 0,
    },

    // Compensation & Location
    salaryPackage: {
      type: String,
      trim: true,
      default: '',
    },
    jobLocation: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    workMode: {
      type: String,
      enum: ['Office', 'Hybrid', 'Remote'],
      default: 'Office',
    },

    // Recruitment Schedule
    applicationDeadline: {
      type: Date,
    },
    interviewDate: {
      type: Date,
    },
    interviewMode: {
      type: String,
      enum: ['Online', 'Offline'],
      default: 'Online',
    },
    interviewLocation: {
      type: String,
      trim: true,
      default: '',
    },
    recruitmentStatus: {
      type: String,
      enum: ['Active', 'On Hold', 'Closed', 'Completed'],
      default: 'Active',
      index: true,
    },

    // Additional
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

companySchema.index({
  companyName: 'text',
  jobRole: 'text',
  industry: 'text',
  jobLocation: 'text',
  companyId: 'text',
});

export const Company = mongoose.model<ICompany>('Company', companySchema);
