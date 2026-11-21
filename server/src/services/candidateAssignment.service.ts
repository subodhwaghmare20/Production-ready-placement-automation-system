import mongoose from 'mongoose';
import { VirtualGroup } from '../models/VirtualGroup.model';
import { GroupMembership } from '../models/GroupMembership.model';
import { GroupActivity } from '../models/GroupActivity.model';
import { Candidate, ICandidate } from '../models/Candidate.model';
import { FetchOperationHistory, FetchSourceType } from '../models/FetchOperationHistory.model';
import { generateFetchOperationId } from '../utils/idGenerator';

export interface AssignmentOptions {
  groupId: string;
  candidateIds: string[];
  sourceType: FetchSourceType;
  adminId?: string;
  adminName?: string;
  allowPlaced?: boolean;
  allowInactive?: boolean;
}

export interface AssignmentSummaryItem {
  candidateId: string;
  fullName: string;
  phone: string;
  consent: boolean;
  status: 'ASSIGNED' | 'REACTIVATED' | 'ALREADY_MEMBER' | 'BLOCKED_PLACED' | 'BLOCKED_INACTIVE' | 'NOT_FOUND';
  reason: string;
}

export interface AssignmentExecutionResult {
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

/**
 * Validates candidates against Smart Assignment Rules and assigns eligible ones to the virtual group
 */
export async function assignCandidatesToVirtualGroup(
  options: AssignmentOptions
): Promise<AssignmentExecutionResult> {
  const {
    groupId,
    candidateIds,
    sourceType,
    adminId,
    adminName = 'Placement Admin',
    allowPlaced = false,
    allowInactive = false,
  } = options;

  const groupQuery = mongoose.isValidObjectId(groupId) ? { _id: groupId } : { groupId: groupId };
  const group = await VirtualGroup.findOne(groupQuery).populate('companyId');
  if (!group) {
    throw new Error('Virtual group not found');
  }

  const company = group.companyId as any;
  const companyName = company ? company.companyName : 'Unknown Company';

  // Find candidate documents
  const validObjectIds = candidateIds.filter((id) => mongoose.isValidObjectId(id));
  const candidateDocs = await Candidate.find({
    $or: [{ _id: { $in: validObjectIds } }, { candidateId: { $in: candidateIds } }],
  });

  const candMap = new Map<string, ICandidate>();
  for (const doc of candidateDocs) {
    candMap.set(String(doc._id), doc);
    candMap.set(doc.candidateId, doc);
  }

  // Find existing memberships for this group
  const existingMemberships = await GroupMembership.find({
    groupId: group._id,
  });

  const membershipMap = new Map<string, typeof existingMemberships[0]>();
  for (const m of existingMemberships) {
    membershipMap.set(String(m.candidateId), m);
  }

  const summary: AssignmentSummaryItem[] = [];
  const assignedRecordsForHistory: Array<{ candidateId: string; fullName: string; phone: string; consent: boolean }> = [];
  const skippedRecordsForHistory: Array<{ candidateId: string; fullName: string; phone: string; reason: string }> = [];

  let newlyAssigned = 0;
  let reactivated = 0;
  let alreadyAssigned = 0;
  let blockedPlaced = 0;
  let blockedInactive = 0;
  let withoutConsentCount = 0;
  let failedCount = 0;

  const toInsert: any[] = [];
  const toReactivate: typeof existingMemberships = [];

  for (const requestedId of candidateIds) {
    const cand = candMap.get(requestedId);
    if (!cand) {
      summary.push({
        candidateId: requestedId,
        fullName: 'Unknown',
        phone: '',
        consent: false,
        status: 'NOT_FOUND',
        reason: 'Candidate ID not found in database',
      });
      skippedRecordsForHistory.push({
        candidateId: requestedId,
        fullName: 'Unknown',
        phone: '',
        reason: 'Candidate record not found in system',
      });
      failedCount++;
      continue;
    }

    const candDbId = String(cand._id);
    const existingMem = membershipMap.get(candDbId);

    // Rule 1: Candidate already in the selected group with Active status
    if (existingMem && existingMem.membershipStatus === 'Active') {
      summary.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
        status: 'ALREADY_MEMBER',
        reason: 'Candidate is already an active member of this virtual group',
      });
      skippedRecordsForHistory.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        reason: 'Already an active member of this virtual group',
      });
      alreadyAssigned++;
      continue;
    }

    // Rule 2: Inactive candidate
    if (cand.placementStatus === 'Inactive' && !allowInactive) {
      summary.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
        status: 'BLOCKED_INACTIVE',
        reason: 'Candidate status is Inactive. Requires explicit admin confirmation to assign.',
      });
      skippedRecordsForHistory.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        reason: 'Candidate is marked Inactive',
      });
      blockedInactive++;
      continue;
    }

    // Rule 3: Placed candidate
    if (cand.placementStatus === 'Placed' && !allowPlaced) {
      summary.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
        status: 'BLOCKED_PLACED',
        reason: 'Candidate is already Placed. Requires explicit confirmation override.',
      });
      skippedRecordsForHistory.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        reason: 'Candidate is already Placed elsewhere',
      });
      blockedPlaced++;
      continue;
    }

    // Rule 4: Consent check (does not block assignment, but records WhatsApp messaging ineligibility)
    if (!cand.whatsappConsent) {
      withoutConsentCount++;
    }

    // Rule 5: Reactivate previously removed membership OR insert new
    if (existingMem && existingMem.membershipStatus === 'Removed') {
      toReactivate.push(existingMem);
      summary.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
        status: 'REACTIVATED',
        reason: 'Previously removed membership reactivated',
      });
      assignedRecordsForHistory.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
      });
      reactivated++;
    } else {
      toInsert.push({
        groupId: group._id,
        candidateId: cand._id,
        membershipStatus: 'Active',
        assignedAt: new Date(),
        assignedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      });
      summary.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
        status: 'ASSIGNED',
        reason: 'Successfully assigned as new active member',
      });
      assignedRecordsForHistory.push({
        candidateId: cand.candidateId,
        fullName: cand.fullName,
        phone: cand.phoneNumber,
        consent: cand.whatsappConsent,
      });
      newlyAssigned++;
    }
  }

  // Execute database writes
  if (toInsert.length > 0) {
    await GroupMembership.insertMany(toInsert);
  }

  for (const mem of toReactivate) {
    mem.membershipStatus = 'Active';
    mem.assignedAt = new Date();
    mem.removedAt = undefined;
    if (adminId) mem.assignedBy = new mongoose.Types.ObjectId(adminId) as any;
    await mem.save();
  }

  // Recalculate group active member count
  const updatedActiveCount = await GroupMembership.countDocuments({
    groupId: group._id,
    membershipStatus: 'Active',
  });
  group.memberCount = updatedActiveCount;
  await group.save();

  // Log group audit activity
  const totalSuccessful = newlyAssigned + reactivated;
  if (totalSuccessful > 0) {
    await GroupActivity.create({
      groupId: group._id,
      action: 'CANDIDATE_ADDED',
      details: `Assigned ${totalSuccessful} candidates (${newlyAssigned} new, ${reactivated} reactivated) via Contact Fetcher (${sourceType}) by ${adminName}`,
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
    });
  }

  // Create FetchOperationHistory record
  const operationId = generateFetchOperationId();
  await FetchOperationHistory.create({
    operationId,
    adminId: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
    adminName,
    sourceType,
    companyId: company ? company._id : undefined,
    groupId: group._id,
    companyName,
    groupName: group.groupName,
    totalProcessed: candidateIds.length,
    validRecords: candidateIds.length - failedCount,
    invalidRecords: failedCount,
    duplicateRecords: alreadyAssigned,
    existingCandidates: candidateDocs.length,
    unknownNumbers: 0,
    successfulAssignments: totalSuccessful,
    alreadyAssigned,
    withoutConsent: withoutConsentCount,
    failedAssignments: blockedPlaced + blockedInactive + failedCount,
    reportData: {
      rejected: [],
      skipped: skippedRecordsForHistory,
      assigned: assignedRecordsForHistory,
    },
  });

  return {
    operationId,
    groupId: String(group.groupId || group._id),
    groupName: group.groupName,
    companyName,
    totalSelected: candidateIds.length,
    newlyAssigned,
    reactivated,
    alreadyAssigned,
    blockedPlaced,
    blockedInactive,
    withoutConsentCount,
    failedCount,
    totalActiveMembers: updatedActiveCount,
    summary,
  };
}

