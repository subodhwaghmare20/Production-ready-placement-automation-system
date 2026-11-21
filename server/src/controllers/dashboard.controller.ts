import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Company } from '../models/Company.model';
import { VirtualGroup } from '../models/VirtualGroup.model';
import { GroupMembership } from '../models/GroupMembership.model';
import { Campaign } from '../models/Campaign.model';
import { CampaignRecipient } from '../models/CampaignRecipient.model';

/**
 * GET /api/dashboard/stats
 * Aggregates real-time statistics for simplified bulk WhatsApp messaging platform:
 * - Total Companies
 * - Total Groups
 * - Total Student Numbers
 * - Total Messages Sent
 * - Recent Campaigns
 */
export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalCompanies,
      totalGroups,
      activeMemberships,
      distinctPhones,
      cloudMessagesSent,
      manualMessagesSent,
      recentCampaigns,
    ] = await Promise.all([
      Company.countDocuments(),
      VirtualGroup.countDocuments(),
      GroupMembership.countDocuments({ membershipStatus: 'Active' }),
      GroupMembership.distinct('normalizedPhoneNumber', { membershipStatus: 'Active' }),
      CampaignRecipient.countDocuments({ providerStatus: { $in: ['SENT', 'DELIVERED', 'READ'] } }),
      CampaignRecipient.countDocuments({ status: 'SENT_MANUALLY_CONFIRMED' }),
      Campaign.find()
        .populate('companyId', 'companyName')
        .populate('groupId', 'groupName memberCount')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const totalStudentNumbers = distinctPhones.length || activeMemberships;
    const totalMessagesSent = Math.max(cloudMessagesSent, manualMessagesSent);

    res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        totalGroups,
        totalStudentNumbers,
        totalMessagesSent,
        recentCampaigns,
      },
    });
  } catch (error) {
    next(error);
  }
};

