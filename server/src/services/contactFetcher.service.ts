import mongoose from 'mongoose';
import { Candidate, ICandidate } from '../models/Candidate.model';
import { Company, ICompany } from '../models/Company.model';
import { VirtualGroup } from '../models/VirtualGroup.model';
import { GroupMembership } from '../models/GroupMembership.model';
import { generateCandidateId, generateFetchOperationId } from '../utils/idGenerator';
import { normalizePhoneNumber, isValidEmail } from '../utils/phoneNormalizer';
import {
  extractAndNormalizeNumbers,
  PasteExtractionResult,
} from './phoneNormalizer.service';
import {
  inspectSpreadsheet,
  parseSpreadsheetWithMapping,
  ColumnMapping,
  SpreadsheetPreviewResult,
  SpreadsheetParsedResult,
} from './spreadsheetParser.service';
import {
  matchCandidatesForCompany,
  CompanyCandidateMatchingResult,
} from './candidateMatching.service';
import {
  assignCandidatesToVirtualGroup,
  AssignmentOptions,
  AssignmentExecutionResult,
} from './candidateAssignment.service';
import { FetchOperationHistory } from '../models/FetchOperationHistory.model';

export interface ManualPasteValidationResult {
  totalParsed: number;
  uniqueValidCount: number;
  duplicateCount: number;
  invalidCount: number;
  existingCount: number;
  unknownCount: number;
  existingCandidates: ICandidate[];
  unknownNumbers: string[];
  invalidItems: { raw: string; error: string }[];
}

export interface RecipientReadinessResult {
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

/**
 * Validates raw pasted phone numbers and matches against MongoDB
 */
export async function validatePastedNumbers(rawInput: string): Promise<ManualPasteValidationResult> {
  const extracted = extractAndNormalizeNumbers(rawInput);

  const existingDocs = await Candidate.find({
    normalizedPhoneNumber: { $in: extracted.uniqueNormalizedNumbers },
  });

  const foundSet = new Set(existingDocs.map((c) => c.normalizedPhoneNumber));
  const unknownNumbers = extracted.uniqueNormalizedNumbers.filter((num) => !foundSet.has(num));

  const invalidItems = extracted.items
    .filter((item) => !item.isValid)
    .map((item) => ({ raw: item.raw, error: item.error || 'Invalid phone format' }));

  return {
    totalParsed: extracted.totalExtracted,
    uniqueValidCount: extracted.uniqueValidCount,
    duplicateCount: extracted.duplicateCount,
    invalidCount: extracted.invalidCount,
    existingCount: existingDocs.length,
    unknownCount: unknownNumbers.length,
    existingCandidates: existingDocs,
    unknownNumbers,
    invalidItems,
  };
}

/**
 * Creates candidates from unknown phone numbers with administrator-supplied profile data
 */
export async function createCandidatesFromUnknownNumbers(
  candidatesData: Array<{
    fullName: string;
    phoneNumber: string;
    email?: string;
    degree?: string;
    branch?: string;
    collegeName?: string;
    passingYear?: number;
    skills?: string[];
    experienceType?: 'Fresher' | 'Experienced';
    whatsappConsent?: boolean;
    whatsappConsentSource?: string;
  }>,
  adminId?: string
): Promise<{
  created: ICandidate[];
  failed: Array<{ phone: string; reason: string }>;
}> {
  const created: ICandidate[] = [];
  const failed: Array<{ phone: string; reason: string }> = [];

  for (const item of candidatesData) {
    if (!item.fullName || !item.fullName.trim()) {
      failed.push({ phone: item.phoneNumber, reason: 'Full Name is required' });
      continue;
    }

    if (!item.phoneNumber || !item.phoneNumber.trim()) {
      failed.push({ phone: item.phoneNumber, reason: 'Phone number is required' });
      continue;
    }

    const norm = normalizePhoneNumber(item.phoneNumber);
    if (!norm.isValid) {
      failed.push({ phone: item.phoneNumber, reason: norm.error || 'Invalid phone format' });
      continue;
    }

    // Check duplicate in DB
    const existing = await Candidate.findOne({ normalizedPhoneNumber: norm.normalized });
    if (existing) {
      failed.push({
        phone: item.phoneNumber,
        reason: `Candidate already registered with phone ${norm.normalized} (${existing.candidateId})`,
      });
      continue;
    }

    if (item.email && !isValidEmail(item.email)) {
      failed.push({ phone: item.phoneNumber, reason: `Invalid email format: ${item.email}` });
      continue;
    }

    const hasConsent = Boolean(item.whatsappConsent);
    const newCand = new Candidate({
      candidateId: generateCandidateId(item.passingYear),
      fullName: item.fullName.trim(),
      phoneNumber: item.phoneNumber.trim(),
      normalizedPhoneNumber: norm.normalized,
      email: item.email ? item.email.trim().toLowerCase() : '',
      collegeName: item.collegeName ? item.collegeName.trim() : '',
      degree: item.degree ? item.degree.trim() : '',
      branch: item.branch ? item.branch.trim() : '',
      passingYear: item.passingYear,
      skills: Array.isArray(item.skills) ? item.skills : [],
      experienceType: item.experienceType || 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: hasConsent,
      whatsappConsentAt: hasConsent ? new Date() : undefined,
      whatsappConsentSource: hasConsent
        ? item.whatsappConsentSource || 'Contact Fetcher Manual Creation'
        : '',
    });

    await newCand.save();
    created.push(newCand);
  }

  return { created, failed };
}

/**
 * Resolves candidate eligibility against a company or its virtual group
 */
export async function matchCandidates(
  candidateIds: string[],
  companyOrGroupId: string
): Promise<CompanyCandidateMatchingResult> {
  let companyDoc: ICompany | null = null;

  if (mongoose.isValidObjectId(companyOrGroupId)) {
    companyDoc = await Company.findById(companyOrGroupId);
    if (!companyDoc) {
      const grp = await VirtualGroup.findById(companyOrGroupId).populate('companyId');
      if (grp && grp.companyId) {
        companyDoc = grp.companyId as unknown as ICompany;
      }
    }
  } else {
    companyDoc = await Company.findOne({ companyId: companyOrGroupId });
    if (!companyDoc) {
      const grp = await VirtualGroup.findOne({ groupId: companyOrGroupId }).populate('companyId');
      if (grp && grp.companyId) {
        companyDoc = grp.companyId as unknown as ICompany;
      }
    }
  }

  if (!companyDoc) {
    throw new Error('Target company or recruitment virtual group not found');
  }

  const validObjectIds = candidateIds.filter((id) => mongoose.isValidObjectId(id));
  const candidates = await Candidate.find({
    $or: [{ _id: { $in: validObjectIds } }, { candidateId: { $in: candidateIds } }],
  });

  return matchCandidatesForCompany(candidates, companyDoc);
}

/**
 * Section 11 WhatsApp integration readiness audit for a virtual group
 */
export async function resolveGroupRecipientReadiness(
  groupId: string
): Promise<RecipientReadinessResult> {
  const groupQuery = mongoose.isValidObjectId(groupId) ? { _id: groupId } : { groupId: groupId };
  const group = await VirtualGroup.findOne(groupQuery).populate('companyId');
  if (!group) {
    throw new Error('Virtual group not found');
  }

  const company = group.companyId as any;
  const companyName = company ? company.companyName : 'N/A';

  const activeMemberships = await GroupMembership.find({
    groupId: group._id,
    membershipStatus: 'Active',
  }).populate('candidateId');

  const readyRecipients: RecipientReadinessResult['readyRecipients'] = [];
  const blockedRecipients: RecipientReadinessResult['blockedRecipients'] = [];

  let withoutConsentCount = 0;
  let invalidPhoneCount = 0;
  let inactiveCandidateCount = 0;

  for (const m of activeMemberships) {
    const cand = m.candidateId as unknown as ICandidate;
    if (!cand) continue;

    // Check 1: Inactive candidate
    if (cand.placementStatus === 'Inactive') {
      inactiveCandidateCount++;
      blockedRecipients.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phoneNumber: cand.phoneNumber,
        reason: 'Candidate profile is marked Inactive',
      });
      continue;
    }

    // Check 2: Valid normalized phone
    const norm = normalizePhoneNumber(cand.phoneNumber);
    if (!norm.isValid) {
      invalidPhoneCount++;
      blockedRecipients.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phoneNumber: cand.phoneNumber,
        reason: norm.error || 'Invalid phone format (Non-E.164)',
      });
      continue;
    }

    // Check 3: WhatsApp Consent
    if (!cand.whatsappConsent) {
      withoutConsentCount++;
      blockedRecipients.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phoneNumber: cand.phoneNumber,
        reason: 'Explicit WhatsApp messaging consent not recorded',
      });
      continue;
    }

    // All conditions met: messaging ready!
    readyRecipients.push({
      candidateId: cand.candidateId,
      fullName: cand.fullName,
      phoneNumber: cand.phoneNumber,
      normalizedPhoneNumber: norm.normalized,
      consentSource: cand.whatsappConsentSource || 'Recorded',
    });
  }

  return {
    groupId: String(group.groupId || group._id),
    groupName: group.groupName,
    companyName,
    totalActiveMembers: activeMemberships.length,
    messagingReadyCount: readyRecipients.length,
    withoutConsentCount,
    invalidPhoneCount,
    inactiveCandidateCount,
    readyRecipients,
    blockedRecipients,
  };
}

export {
  inspectSpreadsheet,
  parseSpreadsheetWithMapping,
  assignCandidatesToVirtualGroup,
};

