import { VirtualGroup } from '../models/VirtualGroup.model';
import { GroupMembership } from '../models/GroupMembership.model';
import { ICandidate } from '../models/Candidate.model';
import { normalizePhoneNumber } from '../utils/phoneNormalizer';

export interface RecipientResolutionResult {
  groupId: string;
  groupName: string;
  companyName: string;
  totalActiveMembers: number;
  totalEligibleRecipients: number;
  eligibleCandidateIds: string[];
  candidatesWithConsent: Partial<ICandidate>[];
  candidatesWithoutConsent: Partial<ICandidate>[];
  invalidPhoneNumbers: Partial<ICandidate>[];
}

/**
 * Recipient Resolution Engine (Module 5 architecture for future Module 6 WhatsApp messaging)
 * Resolves active group members and partitions them based on WhatsApp consent and phone validity.
 * Does not transmit any messages.
 */
export async function resolveGroupRecipients(
  groupId: string
): Promise<RecipientResolutionResult> {
  const group = await VirtualGroup.findById(groupId).populate('companyId', 'companyName');
  if (!group) {
    throw new Error('Virtual group not found');
  }

  // Retrieve all active memberships with populated candidate records
  const activeMemberships = await GroupMembership.find({
    groupId: group._id,
    membershipStatus: 'Active',
  }).populate('candidateId');

  const candidatesWithConsent: Partial<ICandidate>[] = [];
  const candidatesWithoutConsent: Partial<ICandidate>[] = [];
  const invalidPhoneNumbers: Partial<ICandidate>[] = [];
  const eligibleCandidateIds: string[] = [];

  for (const membership of activeMemberships) {
    const candidate = membership.candidateId as unknown as ICandidate;
    if (!candidate) continue;

    const phoneValidation = normalizePhoneNumber(candidate.phoneNumber);
    if (!phoneValidation.isValid) {
      invalidPhoneNumbers.push({
        _id: candidate._id,
        candidateId: candidate.candidateId,
        fullName: candidate.fullName,
        phoneNumber: candidate.phoneNumber,
      });
      continue;
    }

    if (candidate.whatsappConsent === true) {
      candidatesWithConsent.push({
        _id: candidate._id,
        candidateId: candidate.candidateId,
        fullName: candidate.fullName,
        phoneNumber: candidate.phoneNumber,
        normalizedPhoneNumber: candidate.normalizedPhoneNumber,
        whatsappConsent: true,
        whatsappConsentAt: candidate.whatsappConsentAt,
      });
      eligibleCandidateIds.push(String(candidate._id));
    } else {
      candidatesWithoutConsent.push({
        _id: candidate._id,
        candidateId: candidate.candidateId,
        fullName: candidate.fullName,
        phoneNumber: candidate.phoneNumber,
        normalizedPhoneNumber: candidate.normalizedPhoneNumber,
        whatsappConsent: false,
      });
    }
  }

  const company = group.companyId as any;

  return {
    groupId: String(group._id),
    groupName: group.groupName,
    companyName: company?.companyName || 'Unknown Company',
    totalActiveMembers: activeMemberships.length,
    totalEligibleRecipients: eligibleCandidateIds.length,
    eligibleCandidateIds,
    candidatesWithConsent,
    candidatesWithoutConsent,
    invalidPhoneNumbers,
  };
}
