import { LucideIcon } from 'lucide-react';

export interface AdminUser {
  _id: string;
  id?: string;
  adminId?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleId?: RoleData;
  customPermissions?: string[];
  permissions?: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  change?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface HealthStatus {
  success: boolean;
  message: string;
}

export interface DashboardStats {
  totalCompanies: number;
  totalGroups: number;
  totalStudentNumbers: number;
  totalMessagesSent: number;
  recentCampaigns?: Array<{
    _id: string;
    campaignId?: string;
    name?: string;
    companyId?: { _id: string; companyName: string };
    groupId?: { _id: string; groupName: string; memberCount?: number };
    status: string;
    metrics?: { totalRecipients?: number; processedRecipients?: number };
    totalRecipients?: number;
    createdAt: string;
  }>;
  totalCandidates?: number;
  activeVirtualGroups?: number;
  messagesSent?: number;
}

export type ExperienceType = 'Fresher' | 'Experienced';
export type PlacementStatus = 'Available' | 'Placed' | 'Inactive';

export interface Candidate {
  _id: string;
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
  whatsappConsentAt?: string;
  whatsappConsentSource?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateStats {
  totalCandidates: number;
  availableCandidates: number;
  placedCandidates: number;
  inactiveCandidates: number;
  whatsappConsentCount: number;
  fresherCount: number;
  experiencedCount: number;
}

export interface CandidateFilters {
  search?: string;
  branch?: string;
  passingYear?: string | number;
  degree?: string;
  placementStatus?: string;
  experienceType?: string;
  whatsappConsent?: string;
  skills?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CandidatesResponseData {
  candidates: Candidate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface BulkImportPreviewData {
  summary: {
    totalRows: number;
    validCount: number;
    rejectedCount: number;
  };
  validRecords: Partial<Candidate>[];
  rejectedRecords: {
    rowNumber: number;
    data: Record<string, any>;
    reason: string;
  }[];
}

export interface BulkImportConfirmResult {
  totalRequested: number;
  successfullyImported: number;
  failedCount: number;
  errors: string[];
}

// Company Types
export type WorkMode = 'Office' | 'Hybrid' | 'Remote';
export type InterviewMode = 'Online' | 'Offline';
export type RecruitmentStatus = 'Active' | 'On Hold' | 'Closed' | 'Completed';
export type CompanyExperienceType = 'Fresher' | 'Experienced';

export interface Company {
  _id: string;
  companyId: string;
  companyName: string;
  groupsCount?: number;
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
  applicationDeadline?: string;
  interviewDate?: string;
  interviewMode: InterviewMode;
  interviewLocation?: string;
  recruitmentStatus: RecruitmentStatus;

  // Additional
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  onHoldCompanies: number;
  closedCompanies: number;
  completedCompanies: number;
  totalRequiredCandidates: number;
}

export interface CompanyFilters {
  search?: string;
  recruitmentStatus?: string;
  jobLocation?: string;
  experienceType?: string;
  workMode?: string;
  industry?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CompaniesResponseData {
  companies: Company[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CompanyRequirementsData {
  companyId: string;
  companyName: string;
  jobRole: string;
  requiredCandidates: number;
  criteria: {
    skills: string[];
    eligibleBranches: string[];
    eligibleDegrees: string[];
    eligiblePassingYears: number[];
    experienceType: CompanyExperienceType;
    minimumExperience?: number;
    maximumExperience?: number;
    minimumCGPA?: number;
    maximumBacklogs?: number;
  };
  recruitment: {
    recruitmentStatus: RecruitmentStatus;
    interviewDate?: string;
    interviewMode: InterviewMode;
    workMode: WorkMode;
    salaryPackage?: string;
    jobLocation?: string;
  };
}

// Module 5 Virtual Group Types
export type GroupStatus = 'Active' | 'Archived' | 'Completed';
export type MembershipStatus = 'Active' | 'Removed';

export interface VirtualGroup {
  _id: string;
  groupId: string;
  groupName: string;
  description?: string;
  companyId: Company;
  memberCount: number;
  status: GroupStatus;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GroupMembership {
  _id: string;
  groupId: string;
  candidateId?: Candidate;
  phoneNumber?: string;
  normalizedPhoneNumber?: string;
  studentName?: string;
  consentStatus?: 'OptedIn' | 'OptedOut' | 'Pending';
  membershipStatus: MembershipStatus;
  assignedAt: string;
  removedAt?: string;
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GroupActivity {
  _id: string;
  groupId: string;
  action: 'GROUP_CREATED' | 'CANDIDATE_ADDED' | 'CANDIDATE_REMOVED' | 'GROUP_UPDATED' | 'GROUP_ARCHIVED';
  details: string;
  performedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface CandidateEligibilityItem {
  candidate: Candidate;
  candidateId: string;
  isEligible: boolean;
  matchScore: number;
  criteriaBreakdown: {
    degree: { matched: boolean; status: string; reason: string };
    branch: { matched: boolean; status: string; reason: string };
    passingYear: { matched: boolean; status: string; reason: string };
    skills: { matched: boolean; status: string; reason: string; matchingSkills: string[]; missingSkills: string[] };
    experience: { matched: boolean; status: string; reason: string };
  };
}

export interface GroupStats {
  totalActive?: number;
  totalGroups?: number;
  activeGroups?: number;
  archivedGroups?: number;
  completedGroups?: number;
  totalActiveMembers?: number;
  whatsappConsentCount: number;
  noConsentCount: number;
  placedCount?: number;
  availableCount?: number;
  removedCount: number;
}

export interface RecipientResolutionData {
  groupId: string;
  groupName: string;
  companyName: string;
  totalActiveMembers: number;
  totalEligibleRecipients: number;
  eligibleCandidateIds: string[];
  candidatesWithConsent: Partial<Candidate>[];
  candidatesWithoutConsent: Partial<Candidate>[];
  invalidPhoneNumbers: Partial<Candidate>[];
}

export interface VirtualGroupsResponseData {
  groups: VirtualGroup[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Module 6: Contact Fetcher & Candidate Assignment Engine Types
export type FetchSourceType = 'EXCEL' | 'CSV' | 'DATABASE' | 'MANUAL_PASTE';

export interface ColumnMapping {
  fullName: string;
  phoneNumber: string;
  email?: string;
  collegeName?: string;
  degree?: string;
  branch?: string;
  passingYear?: string;
  skills?: string;
  experienceType?: string;
  placementStatus?: string;
  whatsappConsent?: string;
  consentSource?: string;
}

export interface SpreadsheetPreviewData {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  totalRows: number;
  detectedMapping: ColumnMapping;
  sampleRows: Record<string, any>[];
}

export interface SpreadsheetParsedRow {
  rowNumber: number;
  raw: Record<string, any>;
  mapped: {
    fullName: string;
    phoneNumber: string;
    normalizedPhoneNumber: string;
    email: string;
    collegeName: string;
    degree: string;
    branch: string;
    passingYear?: number;
    skills: string[];
    experienceType: 'Fresher' | 'Experienced';
    placementStatus: 'Available' | 'Placed' | 'Inactive';
    whatsappConsent: boolean;
    whatsappConsentSource: string;
  };
  status: 'VALID_NEW' | 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | 'INVALID';
  errors: string[];
  existingCandidateId?: string;
  existingCandidateDbId?: string;
}

export interface SpreadsheetParsedData {
  totalRows: number;
  validNewCount: number;
  existingInDbCount: number;
  duplicateInFileCount: number;
  invalidCount: number;
  createdCount?: number;
  rows: SpreadsheetParsedRow[];
}

export interface ManualPasteValidationData {
  totalParsed: number;
  uniqueValidCount: number;
  duplicateCount: number;
  invalidCount: number;
  existingCount: number;
  unknownCount: number;
  existingCandidates: Candidate[];
  unknownNumbers: string[];
  invalidItems: { raw: string; error: string }[];
}

export type EligibilityCategory = 'ELIGIBLE' | 'PARTIALLY_MATCHING' | 'NOT_ELIGIBLE';

export interface CategorizedCandidateEvaluation {
  candidate: Candidate;
  candidateId: string;
  category: EligibilityCategory;
  categoryLabel: string;
  matchScore: number;
  summaryReasons: {
    matching: string[];
    uncertain: string[];
    failing: string[];
  };
}

export interface CompanyMatchingData {
  companyId: string;
  companyName: string;
  jobRole: string;
  totalEvaluated: number;
  eligibleCount: number;
  partiallyMatchingCount: number;
  notEligibleCount: number;
  candidates: {
    eligible: CategorizedCandidateEvaluation[];
    partiallyMatching: CategorizedCandidateEvaluation[];
    notEligible: CategorizedCandidateEvaluation[];
  };
}

export interface AssignmentSummaryItem {
  candidateId: string;
  fullName: string;
  phone: string;
  consent: boolean;
  status: 'ASSIGNED' | 'REACTIVATED' | 'ALREADY_MEMBER' | 'BLOCKED_PLACED' | 'BLOCKED_INACTIVE' | 'NOT_FOUND';
  reason: string;
}

export interface AssignmentResultData {
  operationId: string;
  groupId: string;
  groupName: string;
  companyName: string;
  totalSelected: number;
  newlyAssigned: number;
  reactivated: number;
  alreadyAssigned: number;
  blockedPlaced: number;
  blockedInactive: number;
  withoutConsentCount: number;
  failedCount: number;
  totalActiveMembers: number;
  summary: AssignmentSummaryItem[];
}

export interface FetchOperationHistoryItem {
  _id: string;
  operationId: string;
  adminName: string;
  sourceType: FetchSourceType;
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
  createdAt: string;
}

export interface RecipientReadinessData {
  groupId: string;
  groupName: string;
  companyName: string;
  totalActiveMembers: number;
  messagingReadyCount: number;
  withoutConsentCount: number;
  invalidPhoneCount: number;
  inactiveCandidateCount: number;
  readyRecipients: Array<{
    candidateId: string;
    fullName: string;
    phoneNumber: string;
    normalizedPhoneNumber: string;
    consentSource: string;
  }>;
  blockedRecipients: Array<{
    candidateId: string;
    fullName: string;
    phoneNumber: string;
    reason: string;
  }>;
}


// ==========================================
// MODULE 7: WHATSAPP MESSAGING & CAMPAIGNS
// ==========================================

export type MessageTemplateCategory =
  | 'JOB_OPPORTUNITY'
  | 'PLACEMENT_OPPORTUNITY'
  | 'INTERVIEW_INVITATION'
  | 'INTERVIEW_REMINDER'
  | 'SHORTLISTED'
  | 'SELECTED_NOTIFICATION'
  | 'REJECTED'
  | 'REJECTION_NOTIFICATION'
  | 'PLACEMENT_CONFIRMATION'
  | 'DOCUMENT_REQUEST'
  | 'DOCUMENT_SUBMISSION'
  | 'GENERAL_ANNOUNCEMENT'
  | 'CUSTOM'
  | 'TECHNICAL_ASSESSMENT';

export interface MessageTemplate {
  _id: string;
  templateId: string;
  name: string;
  templateName?: string;
  subject?: string;
  category: MessageTemplateCategory;
  description?: string;
  content: string;
  messageBody?: string;
  placeholders: string[];
  language?: string;
  status?: 'Active' | 'Inactive' | 'Draft';
  isPredefined: boolean;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type WhatsAppCampaignStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type CampaignRecipientStatus =
  | 'PENDING'
  | 'READY'
  | 'CHAT_OPENED'
  | 'SENT_MANUALLY_CONFIRMED'
  | 'SKIPPED'
  | 'FAILED_TO_OPEN';

export type PersonalizationStatus =
  | 'VALID'
  | 'WARNING_MISSING_DATA'
  | 'INVALID_PLACEHOLDERS'
  | 'MANUALLY_EDITED'
  | 'EXCLUDED';

export interface CampaignMetrics {
  totalRecipients: number;
  eligibleRecipients: number;
  excludedNoConsent: number;
  excludedInvalidPhone: number;
  processedRecipients: number;
  chatOpenedCount: number;
  manuallyConfirmedCount: number;
  skippedCount: number;
  failedCount: number;
  validCount?: number;
  warningCount?: number;
  manuallyEditedCount?: number;
  approvedCount?: number;
  excludedCount?: number;
}

export interface CampaignMetadata {
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewMode?: string;
  customJobRole?: string;
  adminName?: string;
  adminContact?: string;
  notes?: string;
}

export interface WhatsAppCampaign {
  _id: string;
  campaignId: string;
  name: string;
  companyId:
    | {
        _id: string;
        companyName: string;
        companyId: string;
        jobRole?: string;
        industry?: string;
        website?: string;
        hrName?: string;
        hrPhone?: string;
      }
    | string;
  groupId:
    | {
        _id: string;
        groupName: string;
        groupId: string;
        memberCount?: number;
      }
    | string;
  templateId?: {
    _id: string;
    name: string;
    category: string;
  } | string;
  messageTemplateContent?: string;
  messageContent?: string;
  totalRecipients?: number;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
  provider: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  status: WhatsAppCampaignStatus;
  metrics: CampaignMetrics;
  metadata?: CampaignMetadata;
  currentRecipientIndex?: number;
  startedAt?: string;
  completedAt?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  _id: string;
  campaignId: string;
  candidateId?: {
    _id: string;
    candidateId?: string;
    fullName?: string;
    collegeName?: string;
    degree?: string;
    branch?: string;
    passingYear?: number;
    skills?: string[];
    email?: string;
    phoneNumber?: string;
    placementStatus?: PlacementStatus;
  } | string;
  candidateName?: string;
  phoneNumber: string;
  normalizedPhoneNumber?: string;
  personalizedMessage?: string;
  clickToChatUrl?: string;
  status: CampaignRecipientStatus;
  deliveryStatus?: string;
  metaMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  queueOrder?: number;
  originalTemplateId?: string;
  originalTemplateContent?: string;
  personalizationStatus?: PersonalizationStatus;
  missingFields?: string[];
  validationErrors?: string[];
  manuallyEdited?: boolean;
  isApproved?: boolean;
  approvedAt?: string;
  isExcluded?: boolean;
  exclusionReason?: string;
  chatOpenedAt?: string;
  manuallyConfirmedAt?: string;
  skippedAt?: string;
  skipReason?: string;
  notes?: string;
  preparedAt?: string;
  lastAttemptAt?: string;
  lastActionBy?: {
    _id: string;
    name: string;
    email: string;
  };
  lastActionByName?: string;
  errorDetails?: string;
  attemptHistory?: RecipientAttempt[];
  displayPhoneNumber?: string;
  campaignName?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientAttempt {
  attemptNumber: number;
  action: string;
  status: CampaignRecipientStatus;
  timestamp: string;
  performedBy?: string;
  performedByName?: string;
  notes?: string;
  errorDetails?: string;
}

export type CampaignEventType =
  | 'CAMPAIGN_CREATED'
  | 'RECIPIENTS_PREPARED'
  | 'PERSONALIZATION_COMPLETED'
  | 'CAMPAIGN_STARTED'
  | 'CHAT_OPENED'
  | 'MESSAGE_MANUALLY_CONFIRMED'
  | 'RECIPIENT_SKIPPED'
  | 'CHAT_OPENING_FAILED'
  | 'CAMPAIGN_PAUSED'
  | 'CAMPAIGN_RESUMED'
  | 'CAMPAIGN_COMPLETED'
  | 'CAMPAIGN_CANCELLED'
  | 'RECIPIENT_OVERRIDE'
  | 'RECIPIENT_APPROVED'
  | 'RECIPIENT_EXCLUDED';

export interface CampaignActivity {
  _id: string;
  campaignId: string;
  recipientId?: string;
  candidateName?: string;
  eventType: CampaignEventType;
  description: string;
  performedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  performedByName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface OverviewStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pausedCampaigns: number;
  cancelledCampaigns: number;
  totalRecipients: number;
  eligibleRecipients: number;
  messagesOpened: number;
  messagesManuallyConfirmed: number;
  messagesSkipped: number;
  failedToOpenAttempts: number;
  awaitingAction: number;
  mode: 'PERSONAL_ASSISTED';
  disclaimer: string;
}

export interface CampaignTrendItem {
  period: string;
  campaignsCreated: number;
  campaignsCompleted: number;
  recipientsCount: number;
  messagesConfirmed: number;
}

export interface RecipientStatusDistribution {
  pending: number;
  ready: number;
  chatOpened: number;
  sentManuallyConfirmed: number;
  skipped: number;
  failedToOpen: number;
  total: number;
  percentages: {
    pending: number;
    ready: number;
    chatOpened: number;
    sentManuallyConfirmed: number;
    skipped: number;
    failedToOpen: number;
  };
}

export interface CompanyPerformanceItem {
  companyId: string;
  companyName: string;
  industry?: string;
  campaignsCount: number;
  totalCandidates: number;
  eligibleCandidates: number;
  confirmedSends: number;
  skippedCandidates: number;
  failedAttempts: number;
  completionRate: number;
}

export interface CampaignComparisonItem {
  campaignId: string;
  name: string;
  companyName: string;
  status: WhatsAppCampaignStatus;
  totalRecipients: number;
  eligibleRecipients: number;
  manuallyConfirmedCount: number;
  skippedCount: number;
  failedCount: number;
  completionPercentage: number;
  durationFormatted: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface PlaceholderDefinition {
  key: string;
  tag: string;
  category: 'Candidate' | 'Company' | 'Interview' | 'Administrative';
  label: string;
  description: string;
  sampleValue: string;
}

export interface ValidationSummaryData {
  campaignId: string;
  campaignName: string;
  totalRecipients: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  manuallyEditedCount: number;
  approvedCount: number;
  excludedCount: number;
  missingFieldFrequency: Record<string, number>;
  canStartSending: boolean;
}

export interface RecipientPreviewData {
  recipient: CampaignRecipient;
  candidate: Candidate;
  company: Company;
  campaign: WhatsAppCampaign;
  variablesUsed: Record<string, string>;
}

export interface WhatsAppDashboardStats {
  totalCampaigns: number;
  totalRecipients: number;
  messagesPrepared: number;
  messagesManuallyConfirmed: number;
  messagesFailed: number;
  pendingMessages: number;
  activeCampaigns: number;
  completedCampaigns: number;
}

export interface WhatsAppConfigData {
  _id: string;
  mode: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  personal: {
    accountType: 'PERSONAL';
    senderPhone?: string;
    webUrlPrefix: string;
    autoAdvanceOnSent: boolean;
    safetyDelaySeconds: number;
  };
  cloudApi: {
    isEnabled: boolean;
    metaBusinessAccountId?: string;
    wabaId?: string;
    phoneNumberId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    apiVersion: string;
    isVerified: boolean;
  };
  updatedAt: string;
}

// ==========================================
// MODULE 10: WhatsApp Cloud API & Webhooks
// ==========================================

export type WhatsAppCloudConnectionStatus =
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'FAILED'
  | 'TEST_MODE';

export interface WhatsAppCloudConfigData {
  appId: string;
  appSecret: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName?: string;
  qualityRating?: string;
  accessToken: string;
  webhookVerifyToken: string;
  graphApiVersion: string;
  connectionStatus: WhatsAppCloudConnectionStatus;
  isMockMode: boolean;
  lastVerifiedAt?: string;
  lastError?: string;
  webhookCallbackUrl: string;
  hasStoredCredentials: boolean;
  isEnvConfigured: boolean;
}

export type MetaTemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED'
  | 'UNKNOWN';

export type MetaTemplateCategory =
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION';

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export interface MetaTemplateParameterMapping {
  index: number;
  parameterName: string;
  candidateField: string;
}

export interface MetaTemplate {
  _id: string;
  metaTemplateId: string;
  name: string;
  language: string;
  category: MetaTemplateCategory;
  status: MetaTemplateStatus;
  components: MetaTemplateComponent[];
  parameterMappings: MetaTemplateParameterMapping[];
  rawTemplate?: any;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventData {
  _id: string;
  eventId: string;
  eventType: string;
  provider: string;
  payload: any;
  signatureVerified: boolean;
  processingStatus: 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  receivedAt: string;
  processedAt?: string;
  errorMessage?: string;
}

export interface InboundMessageData {
  _id: string;
  providerMessageId: string;
  senderPhoneNumber: string;
  normalizedSenderPhoneNumber: string;
  senderName?: string;
  messageType: string;
  textBody?: string;
  mediaMetadata?: {
    mimeType?: string;
    sha256?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
  rawPayload?: any;
  receivedAt: string;
  linkedCandidateId?: Candidate;
  linkedCampaignId?: WhatsAppCampaign;
  processingStatus: 'UNREAD' | 'READ' | 'RESOLVED';
  isOptOutRequest: boolean;
}

export interface SuppressionRecord {
  _id: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  optedOutAt: string;
  source: 'INBOUND_STOP' | 'MANUAL_ADMIN';
  reason?: string;
  candidateId?: Candidate;
}

// ==========================================
// MODULE 11: Admin Settings, Roles & Auditing
// ==========================================

export interface RoleData {
  _id: string;
  roleId: string;
  name: string;
  slug: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PermissionItem {
  key: string;
  name: string;
  category: string;
  description: string;
}

export interface AuditLogData {
  _id: string;
  auditId: string;
  actorId?: string;
  actorName: string;
  actorEmail: string;
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details?: Record<string, any>;
  createdAt: string;
}

export interface AdminSessionData {
  _id: string;
  sessionId: string;
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
  browser: string;
  os: string;
  device: string;
  lastActive: string;
  expiresAt: string;
  isRevoked: boolean;
  isCurrent?: boolean;
}

export interface SystemSettingsData {
  _id?: string;
  general: {
    applicationName: string;
    logoUrl?: string;
    organizationName: string;
    organizationEmail: string;
    organizationPhone: string;
    defaultTimezone: string;
    dateFormat: string;
    defaultLanguage: string;
  };
  candidate: {
    defaultPlacementStatus: string;
    allowedImportFormats: string[];
    maxResumeFileSizeMb: number;
    allowedResumeFileTypes: string[];
    duplicateDetectionFields: string[];
  };
  campaign: {
    defaultMessageProvider: 'PERSONAL_ASSISTED' | 'CLOUD_API';
    defaultBatchSize: number;
    defaultMessageLanguage: string;
    requireCampaignApproval: boolean;
  };
  security: {
    sessionTimeoutHours: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    minPasswordLength: number;
    requireSpecialChar: boolean;
    requireNumber: boolean;
    requireUppercase: boolean;
  };
  notifications: {
    emailNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    campaignCompletedAlert: boolean;
    campaignFailedAlert: boolean;
    adminActivityAlert: boolean;
  };
}

export interface SystemStatsData {
  recordCounts: {
    candidates: number;
    companies: number;
    groups: number;
    campaigns: number;
    admins: number;
    auditLogs: number;
  };
  health: {
    status: string;
    nodeVersion: string;
    uptimeSeconds: number;
    memoryUsageMb: number;
    totalHeapMb: number;
    environment: string;
  };
}


