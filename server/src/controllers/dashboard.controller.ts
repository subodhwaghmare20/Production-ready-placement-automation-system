import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Candidate } from '../models/Candidate.model';
import { Company } from '../models/Company.model';
import { VirtualGroup } from '../models/VirtualGroup.model';
import { Message } from '../models/Message.model';
import { CampaignRecipient } from '../models/CampaignRecipient.model';

/**
 * GET /api/dashboard/stats
 * Aggregates real-time statistics from MongoDB collections.
 * Protected with authMiddleware.
 */
export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalCandidates,
      totalCompanies,
      activeVirtualGroups,
      legacyMessages,
      campaignConfirmedMessages,
    ] = await Promise.all([
      Candidate.countDocuments(),
      Company.countDocuments(),
      VirtualGroup.countDocuments({ status: 'active' }),
      Message.countDocuments({ status: { $in: ['sent', 'delivered'] } }),
      CampaignRecipient.countDocuments({ status: 'SENT_MANUALLY_CONFIRMED' }),
    ]);

    const messagesSent = legacyMessages + campaignConfirmedMessages;

    res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        totalCompanies,
        activeVirtualGroups,
        messagesSent,
      },
    });
  } catch (error) {
    next(error);
  }
};

