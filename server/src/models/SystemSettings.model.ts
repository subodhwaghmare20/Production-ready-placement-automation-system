import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneralSettings {
  applicationName: string;
  logoUrl?: string;
  organizationName: string;
  organizationEmail: string;
  organizationPhone: string;
  defaultTimezone: string;
  dateFormat: string;
  defaultLanguage: string;
}

export interface ICandidateSettings {
  defaultPlacementStatus: string;
  allowedImportFormats: string[];
  maxResumeFileSizeMb: number;
  allowedResumeFileTypes: string[];
  duplicateDetectionFields: string[];
}

export interface ICampaignSettings {
  defaultMessageProvider: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  defaultBatchSize: number;
  defaultMessageLanguage: string;
  requireCampaignApproval: boolean;
}

export interface ISecuritySettings {
  sessionTimeoutHours: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  minPasswordLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  requireUppercase: boolean;
}

export interface INotificationSettings {
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  campaignCompletedAlert: boolean;
  campaignFailedAlert: boolean;
  adminActivityAlert: boolean;
}

export interface ISystemSettings extends Document {
  general: IGeneralSettings;
  candidate: ICandidateSettings;
  campaign: ICampaignSettings;
  security: ISecuritySettings;
  notifications: INotificationSettings;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    general: {
      applicationName: { type: String, default: 'PlacementAuto' },
      logoUrl: { type: String, default: '' },
      organizationName: { type: String, default: 'Campus Training & Placement Cell' },
      organizationEmail: { type: String, default: 'placement@campus.edu' },
      organizationPhone: { type: String, default: '+91 9876543210' },
      defaultTimezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      defaultLanguage: { type: String, default: 'en' },
    },
    candidate: {
      defaultPlacementStatus: { type: String, default: 'Available' },
      allowedImportFormats: { type: [String], default: ['.xlsx', '.xls', '.csv'] },
      maxResumeFileSizeMb: { type: Number, default: 5 },
      allowedResumeFileTypes: { type: [String], default: ['.pdf', '.docx', '.doc'] },
      duplicateDetectionFields: { type: [String], default: ['phoneNumber', 'email'] },
    },
    campaign: {
      defaultMessageProvider: {
        type: String,
        enum: ['PERSONAL_ASSISTED', 'CLOUD_API'],
        default: 'PERSONAL_ASSISTED',
      },
      defaultBatchSize: { type: Number, default: 50 },
      defaultMessageLanguage: { type: String, default: 'en_US' },
      requireCampaignApproval: { type: Boolean, default: true },
    },
    security: {
      sessionTimeoutHours: { type: Number, default: 168 },
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDurationMinutes: { type: Number, default: 15 },
      minPasswordLength: { type: Number, default: 8 },
      requireSpecialChar: { type: Boolean, default: true },
      requireNumber: { type: Boolean, default: true },
      requireUppercase: { type: Boolean, default: true },
    },
    notifications: {
      emailNotificationsEnabled: { type: Boolean, default: false },
      inAppNotificationsEnabled: { type: Boolean, default: true },
      campaignCompletedAlert: { type: Boolean, default: true },
      campaignFailedAlert: { type: Boolean, default: true },
      adminActivityAlert: { type: Boolean, default: true },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

export const SystemSettings = mongoose.model<ISystemSettings>(
  'SystemSettings',
  systemSettingsSchema
);
export const AppSetting = SystemSettings;
export type IAppSetting = ISystemSettings;
