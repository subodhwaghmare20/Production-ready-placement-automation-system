import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { VirtualGroup, GroupStatus } from '../models/VirtualGroup.model';
import { GroupMembership } from '../models/GroupMembership.model';
import { GroupActivity } from '../models/GroupActivity.model';
import { Company } from '../models/Company.model';
import { Candidate } from '../models/Candidate.model';
import { generateGroupId } from '../utils/idGenerator';
import { evaluateCandidateEligibility } from '../services/eligibilityService';
import { resolveGroupRecipients } from '../services/recipientService';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * POST /api/groups
 * Creates a new company-wise virtual group (enforcing one primary group per company rule)
 */
export const createGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId, groupName, description, candidateIds } = req.body;

    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID is required' });
      return;
    }

    if (!groupName || !groupName.trim()) {
      res.status(400).json({ success: false, message: 'Group name is required' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Referenced company not found' });
      return;
    }

    // Enforce one primary group per company constraint
    const existingGroup = await VirtualGroup.findOne({ companyId: company._id });
    if (existingGroup) {
      res.status(409).json({
        success: false,
        message: `A virtual group already exists for ${company.companyName} (${existingGroup.groupId} - ${existingGroup.groupName}). A company may have only one primary recruitment group in this module.`,
      });
      return;
    }

    const newGroup = new VirtualGroup({
      groupId: generateGroupId(),
      groupName: groupName.trim(),
      description: description ? description.trim() : '',
      companyId: company._id,
      memberCount: 0,
      status: 'Active',
      createdBy: req.admin?._id,
    });

    await newGroup.save();

    // Log creation activity
    await GroupActivity.create({
      groupId: newGroup._id,
      action: 'GROUP_CREATED',
      details: `Virtual group "${newGroup.groupName}" initialized for ${company.companyName} by ${req.admin?.name || 'Admin'}`,
      performedBy: req.admin?._id,
    });

    // If initial candidate IDs were provided, add them in bulk
    let addedCount = 0;
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      const validCandidateDocs = await Candidate.find({ _id: { $in: candidateIds } }).select('_id fullName candidateId');
      
      const membershipDocs = validCandidateDocs.map((cand) => ({
        groupId: newGroup._id,
        candidateId: cand._id,
        membershipStatus: 'Active',
        assignedAt: new Date(),
        assignedBy: req.admin?._id,
      }));

      if (membershipDocs.length > 0) {
        await GroupMembership.insertMany(membershipDocs);
        addedCount = membershipDocs.length;
        newGroup.memberCount = addedCount;
        await newGroup.save();

        await GroupActivity.create({
          groupId: newGroup._id,
          action: 'CANDIDATE_ADDED',
          details: `Assigned ${addedCount} initial candidates to group upon creation`,
          performedBy: req.admin?._id,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Virtual group created successfully',
      data: {
        ...newGroup.toObject(),
        company,
        initialMembersAdded: addedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups
 * Paginated list with search, status filtering, and populated company
 */
export const getGroups = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, status, companyId } = req.query;

    const filter: Record<string, any> = {};

    if (status && typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }

    if (companyId && typeof companyId === 'string' && companyId.trim()) {
      filter.companyId = companyId.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const matchingCompanies = await Company.find({ companyName: searchRegex }).select('_id');
      const companyIds = matchingCompanies.map((c) => c._id);

      filter.$or = [
        { groupName: searchRegex },
        { groupId: searchRegex },
        { companyId: { $in: companyIds } },
      ];
    }

    const [total, groups] = await Promise.all([
      VirtualGroup.countDocuments(filter),
      VirtualGroup.find(filter)
        .populate('companyId', 'companyName jobRole requiredCandidates jobLocation recruitmentStatus')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Ensure memberCount reflects live active memberships
    const groupsWithAccurateCount = await Promise.all(
      groups.map(async (g) => {
        const liveCount = await GroupMembership.countDocuments({
          groupId: g._id,
          membershipStatus: 'Active',
        });
        return {
          ...g,
          memberCount: liveCount,
        };
      })
    );

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: {
        groups: groupsWithAccurateCount,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id
 * Retrieve group profile with company details and live active member count
 */
export const getGroupById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };

    const group = await VirtualGroup.findOne(query)
      .populate('companyId')
      .populate('createdBy', 'name email');

    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const liveMemberCount = await GroupMembership.countDocuments({
      groupId: group._id,
      membershipStatus: 'Active',
    });

    res.status(200).json({
      success: true,
      data: {
        ...group.toObject(),
        memberCount: liveMemberCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/groups/:id
 * Update group name, description, or recruitment status
 */
export const updateGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };

    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const { groupName, description, status } = req.body;
    const previousStatus = group.status;

    if (groupName !== undefined) group.groupName = groupName.trim();
    if (description !== undefined) group.description = description.trim();
    if (status !== undefined) group.status = status as GroupStatus;

    await group.save();

    // Log update in activity
    let actionType: any = 'GROUP_UPDATED';
    if (status === 'Archived' && previousStatus !== 'Archived') {
      actionType = 'GROUP_ARCHIVED';
    }

    await GroupActivity.create({
      groupId: group._id,
      action: actionType,
      details: `Group updated by ${req.admin?.name || 'Admin'}${status ? ` (Status changed to ${status})` : ''}`,
      performedBy: req.admin?._id,
    });

    res.status(200).json({
      success: true,
      message: 'Virtual group updated successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/groups/:id
 * Removes virtual group and associated memberships
 */
export const deleteGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };

    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    await GroupMembership.deleteMany({ groupId: group._id });
    await GroupActivity.deleteMany({ groupId: group._id });
    await VirtualGroup.deleteOne({ _id: group._id });

    res.status(200).json({
      success: true,
      message: `Virtual group ${group.groupName} removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/groups/:id/members
 * Assigns one or multiple candidates to a virtual group. Prevents duplicate active memberships.
 */
export const addGroupMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { candidateIds } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      res.status(400).json({ success: false, message: 'candidateIds array is required' });
      return;
    }

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    let addedCount = 0;
    let reactivatedCount = 0;
    let alreadyActiveCount = 0;
    const addedCandidateNames: string[] = [];

    for (const candId of candidateIds) {
      const candidate = await Candidate.findById(candId);
      if (!candidate) continue;

      const existingMembership = await GroupMembership.findOne({
        groupId: group._id,
        candidateId: candidate._id,
      });

      if (existingMembership) {
        if (existingMembership.membershipStatus === 'Active') {
          alreadyActiveCount++;
        } else {
          // Reactivate previously removed membership while preserving historical record
          existingMembership.membershipStatus = 'Active';
          existingMembership.assignedAt = new Date();
          existingMembership.removedAt = undefined;
          existingMembership.assignedBy = req.admin?._id;
          await existingMembership.save();
          reactivatedCount++;
          addedCandidateNames.push(candidate.fullName);
        }
      } else {
        // Create new membership record
        await GroupMembership.create({
          groupId: group._id,
          candidateId: candidate._id,
          membershipStatus: 'Active',
          assignedAt: new Date(),
          assignedBy: req.admin?._id,
        });
        addedCount++;
        addedCandidateNames.push(candidate.fullName);
      }
    }

    // Refresh live member count on group
    const totalActive = await GroupMembership.countDocuments({
      groupId: group._id,
      membershipStatus: 'Active',
    });
    group.memberCount = totalActive;
    await group.save();

    const netAdded = addedCount + reactivatedCount;
    if (netAdded > 0) {
      const nameSummary =
        addedCandidateNames.length <= 3
          ? addedCandidateNames.join(', ')
          : `${addedCandidateNames.slice(0, 2).join(', ')} and ${addedCandidateNames.length - 2} others`;

      await GroupActivity.create({
        groupId: group._id,
        action: 'CANDIDATE_ADDED',
        details: `Assigned ${netAdded} candidate(s) (${nameSummary}) by ${req.admin?.name || 'Admin'}`,
        performedBy: req.admin?._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Assigned ${netAdded} candidates to ${group.groupName}`,
      data: {
        totalActiveMembers: totalActive,
        newlyAdded: addedCount,
        reactivated: reactivatedCount,
        alreadyActive: alreadyActiveCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id/members
 * Paginated list of members with search and membership status filtering
 */
export const getGroupMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { status = 'Active', search } = req.query;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const membershipFilter: Record<string, any> = { groupId: group._id };
    if (status && status !== 'all') {
      membershipFilter.membershipStatus = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const matchingCandidates = await Candidate.find({
        $or: [
          { fullName: searchRegex },
          { candidateId: searchRegex },
          { phoneNumber: searchRegex },
          { email: searchRegex },
          { branch: searchRegex },
        ],
      }).select('_id');

      membershipFilter.candidateId = { $in: matchingCandidates.map((c) => c._id) };
    }

    const [total, memberships] = await Promise.all([
      GroupMembership.countDocuments(membershipFilter),
      GroupMembership.find(membershipFilter)
        .populate('candidateId')
        .populate('assignedBy', 'name email')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: {
        memberships,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/groups/:id/members/:candidateId
 * Removes candidate from group while preserving historical record (status set to Removed)
 */
export const removeGroupMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, candidateId } = req.params;

    const groupQuery = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(groupQuery);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const candQuery = mongoose.isValidObjectId(candidateId)
      ? { _id: candidateId }
      : { candidateId: candidateId };
    const candidate = await Candidate.findOne(candQuery);
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    const membership = await GroupMembership.findOne({
      groupId: group._id,
      candidateId: candidate._id,
    });

    if (!membership) {
      res.status(404).json({ success: false, message: 'Candidate is not a member of this group' });
      return;
    }

    membership.membershipStatus = 'Removed';
    membership.removedAt = new Date();
    await membership.save();

    // Recalculate active member count
    const activeCount = await GroupMembership.countDocuments({
      groupId: group._id,
      membershipStatus: 'Active',
    });
    group.memberCount = activeCount;
    await group.save();

    const reason = req.body?.reason || req.query?.reason;
    await GroupActivity.create({
      groupId: group._id,
      action: 'CANDIDATE_REMOVED',
      details: `Removed candidate ${candidate.fullName} (${candidate.candidateId}) from active group members${
        reason ? `: ${reason}` : ''
      }`,
      performedBy: req.admin?._id,
    });

    res.status(200).json({
      success: true,
      message: `Candidate ${candidate.fullName} removed from ${group.groupName}`,
      data: {
        totalActiveMembers: activeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/stats
 * Aggregate metrics across all virtual groups
 */
export const getOverallGroupStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalGroups = await VirtualGroup.countDocuments();
    const activeGroups = await VirtualGroup.countDocuments({ status: 'Active' });
    const archivedGroups = await VirtualGroup.countDocuments({ status: 'Archived' });
    const completedGroups = await VirtualGroup.countDocuments({ status: 'Completed' });

    const activeMemberships = await GroupMembership.find({ membershipStatus: 'Active' }).populate(
      'candidateId',
      'whatsappConsent'
    );
    const totalActiveMembers = activeMemberships.length;
    let whatsappConsentCount = 0;
    for (const m of activeMemberships) {
      const c = m.candidateId as any;
      if (c?.whatsappConsent) {
        whatsappConsentCount++;
      }
    }
    const removedCount = await GroupMembership.countDocuments({ membershipStatus: 'Removed' });

    res.status(200).json({
      success: true,
      data: {
        totalGroups,
        activeGroups,
        archivedGroups,
        completedGroups,
        totalActiveMembers,
        whatsappConsentCount,
        noConsentCount: totalActiveMembers - whatsappConsentCount,
        removedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id/stats
 * Aggregate metrics of virtual group membership and consent status
 */
export const getGroupStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const activeMemberships = await GroupMembership.find({
      groupId: group._id,
      membershipStatus: 'Active',
    }).populate('candidateId', 'whatsappConsent placementStatus');

    const totalActive = activeMemberships.length;
    let whatsappConsentCount = 0;
    let placedCount = 0;
    let availableCount = 0;

    for (const m of activeMemberships) {
      const c = m.candidateId as any;
      if (c) {
        if (c.whatsappConsent) whatsappConsentCount++;
        if (c.placementStatus === 'Placed') placedCount++;
        if (c.placementStatus === 'Available') availableCount++;
      }
    }

    const removedCount = await GroupMembership.countDocuments({
      groupId: group._id,
      membershipStatus: 'Removed',
    });

    res.status(200).json({
      success: true,
      data: {
        totalActive,
        whatsappConsentCount,
        noConsentCount: totalActive - whatsappConsentCount,
        placedCount,
        availableCount,
        removedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id/eligible-candidates
 * Evaluates candidate database against group's company requirements to suggest matches
 */
export const getEligibleCandidates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(query).populate('companyId');
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const company = group.companyId as any;
    if (!company) {
      res.status(404).json({ success: false, message: 'Associated company not found' });
      return;
    }

    // Get candidate IDs already active in this group
    const activeMemberDocs = await GroupMembership.find({
      groupId: group._id,
      membershipStatus: 'Active',
    }).select('candidateId');
    const activeCandidateIds = activeMemberDocs.map((m) => m.candidateId);

    // Fetch non-active candidates
    const candidates = await Candidate.find({ _id: { $nin: activeCandidateIds } }).lean();

    const evaluations = candidates.map((cand) => {
      const evaluation = evaluateCandidateEligibility(cand as any, company);
      return {
        candidate: cand,
        ...evaluation,
      };
    });

    // Sort by matchScore descending, then by fullName
    evaluations.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      success: true,
      data: {
        totalSuggested: evaluations.length,
        eligibleCount: evaluations.filter((e) => e.isEligible).length,
        evaluations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id/available-candidates
 * Paginated list of candidates available to be added to this group
 */
export const getAvailableCandidates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, branch, passingYear, placementStatus, whatsappConsent } = req.query;

    const groupQuery = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(groupQuery);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const activeMemberDocs = await GroupMembership.find({
      groupId: group._id,
      membershipStatus: 'Active',
    }).select('candidateId');
    const activeCandidateIds = activeMemberDocs.map((m) => m.candidateId);

    const filter: Record<string, any> = {
      _id: { $nin: activeCandidateIds },
    };

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { candidateId: searchRegex },
        { phoneNumber: searchRegex },
        { email: searchRegex },
        { branch: searchRegex },
      ];
    }

    if (branch) filter.branch = new RegExp(`^${(branch as string).trim()}$`, 'i');
    if (passingYear) filter.passingYear = Number(passingYear);
    if (placementStatus) filter.placementStatus = (placementStatus as string).trim();
    if (whatsappConsent !== undefined && whatsappConsent !== '') {
      filter.whatsappConsent = whatsappConsent === 'true' || whatsappConsent === '1';
    }

    const [total, candidates] = await Promise.all([
      Candidate.countDocuments(filter),
      Candidate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: {
        candidates,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id/recipient-resolution
 * Module 5 preparatory architecture for future WhatsApp messaging recipient resolution
 */
export const getRecipientResolution = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const result = await resolveGroupRecipients(String(group._id));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id/activities
 * Activity history timeline
 */
export const getGroupActivities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { groupId: id };
    const group = await VirtualGroup.findOne(query);
    if (!group) {
      res.status(404).json({ success: false, message: 'Virtual group not found' });
      return;
    }

    const activities = await GroupActivity.find({ groupId: group._id })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};
