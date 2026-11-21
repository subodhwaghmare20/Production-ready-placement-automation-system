import mongoose from 'mongoose';
import { Campaign, ICampaign, CampaignStatus } from '../models/Campaign.model';
import { CampaignRecipient, ICampaignRecipient, RecipientStatus } from '../models/CampaignRecipient.model';
import { Company } from '../models/Company.model';
import { maskPhoneNumber } from '../utils/phoneMask';

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
  period: string; // e.g. "2026-11" or "2026-11-21"
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
  status: CampaignStatus;
  totalRecipients: number;
  eligibleRecipients: number;
  manuallyConfirmedCount: number;
  skippedCount: number;
  failedCount: number;
  completionPercentage: number;
  durationFormatted: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export class AnalyticsService {
  /**
   * 1. Campaign Analytics Dashboard Overview Stats
   */
  async getOverviewStats(filters: {
    startDate?: string;
    endDate?: string;
    companyId?: string;
  } = {}): Promise<OverviewStats> {
    const campaignQuery: Record<string, unknown> = {};
    if (filters.companyId && filters.companyId.match(/^[0-9a-fA-F]{24}$/)) {
      campaignQuery.companyId = new mongoose.Types.ObjectId(filters.companyId);
    }
    if (filters.startDate || filters.endDate) {
      campaignQuery.createdAt = {};
      if (filters.startDate) {
        (campaignQuery.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (campaignQuery.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const campaigns = await Campaign.find(campaignQuery).select(
      'status metrics startedAt completedAt createdAt'
    );
    const campaignIds = campaigns.map((c) => c._id);

    let totalRecipients = 0;
    let eligibleRecipients = 0;
    let activeCampaigns = 0;
    let completedCampaigns = 0;
    let pausedCampaigns = 0;
    let cancelledCampaigns = 0;

    for (const c of campaigns) {
      totalRecipients += c.metrics?.totalRecipients || 0;
      eligibleRecipients += c.metrics?.eligibleRecipients || 0;

      if (['IN_PROGRESS', 'PREPARED', 'READY'].includes(c.status)) {
        activeCampaigns++;
      } else if (c.status === 'COMPLETED') {
        completedCampaigns++;
      } else if (c.status === 'PAUSED') {
        pausedCampaigns++;
      } else if (c.status === 'CANCELLED') {
        cancelledCampaigns++;
      }
    }

    // Real Recipient status counts from database
    const recipientQuery: Record<string, unknown> = {};
    if (campaignIds.length > 0) {
      recipientQuery.campaignId = { $in: campaignIds };
    } else if (Object.keys(campaignQuery).length > 0) {
      // If no campaigns match the filter, return 0
      recipientQuery.campaignId = new mongoose.Types.ObjectId();
    }

    const [
      chatOpenedCount,
      confirmedCount,
      skippedCount,
      failedCount,
      awaitingActionCount,
    ] = await Promise.all([
      CampaignRecipient.countDocuments({ ...recipientQuery, status: 'CHAT_OPENED' }),
      CampaignRecipient.countDocuments({ ...recipientQuery, status: 'SENT_MANUALLY_CONFIRMED' }),
      CampaignRecipient.countDocuments({ ...recipientQuery, status: 'SKIPPED' }),
      CampaignRecipient.countDocuments({ ...recipientQuery, status: 'FAILED_TO_OPEN' }),
      CampaignRecipient.countDocuments({
        ...recipientQuery,
        status: { $in: ['READY', 'PENDING'] },
        isExcluded: { $ne: true },
      }),
    ]);

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns,
      completedCampaigns,
      pausedCampaigns,
      cancelledCampaigns,
      totalRecipients,
      eligibleRecipients,
      messagesOpened: chatOpenedCount,
      messagesManuallyConfirmed: confirmedCount,
      messagesSkipped: skippedCount,
      failedToOpenAttempts: failedCount,
      awaitingAction: awaitingActionCount,
      mode: 'PERSONAL_ASSISTED',
      disclaimer:
        'WhatsApp delivery and read status cannot be independently verified in personal assisted mode. Manually confirmed messages represent administrator-assisted sends and are not verified deliveries.',
    };
  }

  /**
   * 2. Campaign Trends Over Time (Monthly or Daily)
   */
  async getCampaignTrends(options: {
    interval?: 'day' | 'month';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<CampaignTrendItem[]> {
    const interval = options.interval || 'month';
    const query: Record<string, unknown> = {};

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(options.endDate);
      }
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: 1 });

    const trendMap = new Map<string, CampaignTrendItem>();

    for (const c of campaigns) {
      const d = new Date(c.createdAt);
      const periodKey =
        interval === 'day'
          ? d.toISOString().split('T')[0]
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!trendMap.has(periodKey)) {
        trendMap.set(periodKey, {
          period: periodKey,
          campaignsCreated: 0,
          campaignsCompleted: 0,
          recipientsCount: 0,
          messagesConfirmed: 0,
        });
      }

      const item = trendMap.get(periodKey)!;
      item.campaignsCreated++;
      if (c.status === 'COMPLETED') item.campaignsCompleted++;
      item.recipientsCount += c.metrics?.eligibleRecipients || c.metrics?.totalRecipients || 0;
      item.messagesConfirmed += c.metrics?.manuallyConfirmedCount || 0;
    }

    return Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 3. Recipient Status Breakdown
   */
  async getRecipientStatusDistribution(filters: {
    campaignId?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<RecipientStatusDistribution> {
    const query: Record<string, unknown> = {};

    if (filters.campaignId && filters.campaignId.match(/^[0-9a-fA-F]{24}$/)) {
      query.campaignId = new mongoose.Types.ObjectId(filters.campaignId);
    } else if (filters.companyId && filters.companyId.match(/^[0-9a-fA-F]{24}$/)) {
      const companyCampaigns = await Campaign.find({
        companyId: new mongoose.Types.ObjectId(filters.companyId),
      }).select('_id');
      query.campaignId = { $in: companyCampaigns.map((c) => c._id) };
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const [pending, ready, chatOpened, confirmed, skipped, failed] = await Promise.all([
      CampaignRecipient.countDocuments({ ...query, status: 'PENDING' }),
      CampaignRecipient.countDocuments({ ...query, status: 'READY' }),
      CampaignRecipient.countDocuments({ ...query, status: 'CHAT_OPENED' }),
      CampaignRecipient.countDocuments({ ...query, status: 'SENT_MANUALLY_CONFIRMED' }),
      CampaignRecipient.countDocuments({ ...query, status: 'SKIPPED' }),
      CampaignRecipient.countDocuments({ ...query, status: 'FAILED_TO_OPEN' }),
    ]);

    const total = pending + ready + chatOpened + confirmed + skipped + failed;

    const pct = (val: number) => (total > 0 ? Math.round((val / total) * 1000) / 10 : 0);

    return {
      pending,
      ready,
      chatOpened,
      sentManuallyConfirmed: confirmed,
      skipped,
      failedToOpen: failed,
      total,
      percentages: {
        pending: pct(pending),
        ready: pct(ready),
        chatOpened: pct(chatOpened),
        sentManuallyConfirmed: pct(confirmed),
        skipped: pct(skipped),
        failedToOpen: pct(failed),
      },
    };
  }

  /**
   * 4. Company Performance Aggregation
   */
  async getCompanyPerformance(filters: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<CompanyPerformanceItem[]> {
    const query: Record<string, unknown> = {};
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const campaigns = await Campaign.find(query)
      .populate('companyId', 'companyName companyId industry')
      .lean();

    const companyMap = new Map<string, CompanyPerformanceItem>();

    for (const c of campaigns) {
      const company = c.companyId as any;
      if (!company) continue;
      const compId = company._id ? company._id.toString() : 'UNKNOWN';

      if (!companyMap.has(compId)) {
        companyMap.set(compId, {
          companyId: company.companyId || compId,
          companyName: company.companyName || 'Unknown Company',
          industry: company.industry,
          campaignsCount: 0,
          totalCandidates: 0,
          eligibleCandidates: 0,
          confirmedSends: 0,
          skippedCandidates: 0,
          failedAttempts: 0,
          completionRate: 0,
        });
      }

      const item = companyMap.get(compId)!;
      item.campaignsCount += 1;
      item.totalCandidates += c.metrics?.totalRecipients || 0;
      item.eligibleCandidates += c.metrics?.eligibleRecipients || 0;
      item.confirmedSends += c.metrics?.manuallyConfirmedCount || 0;
      item.skippedCandidates += c.metrics?.skippedCount || 0;
      item.failedAttempts += c.metrics?.failedCount || 0;
    }

    // Calculate rates
    for (const item of companyMap.values()) {
      item.completionRate =
        item.eligibleCandidates > 0
          ? Math.round((item.confirmedSends / item.eligibleCandidates) * 100)
          : 0;
    }

    return Array.from(companyMap.values()).sort((a, b) => b.confirmedSends - a.confirmedSends);
  }

  /**
   * 5. Campaign List with Detailed Analytics & Progress
   */
  async getCampaignListWithAnalytics(filters: {
    search?: string;
    status?: string;
    companyId?: string;
    groupId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    campaigns: Array<ICampaign & { progressPercentage: number; remainingCount: number }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.companyId && filters.companyId.match(/^[0-9a-fA-F]{24}$/)) {
      query.companyId = new mongoose.Types.ObjectId(filters.companyId);
    }

    if (filters.groupId && filters.groupId.match(/^[0-9a-fA-F]{24}$/)) {
      query.groupId = new mongoose.Types.ObjectId(filters.groupId);
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { campaignId: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('companyId', 'companyName companyId jobRole')
        .populate('groupId', 'groupName groupId memberCount')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Campaign.countDocuments(query),
    ]);

    const enriched = campaigns.map((c) => {
      const eligible = c.metrics?.eligibleRecipients || 0;
      const confirmed = c.metrics?.manuallyConfirmedCount || 0;
      const skipped = c.metrics?.skippedCount || 0;
      const failed = c.metrics?.failedCount || 0;
      const processed = confirmed + skipped + failed;
      const remaining = Math.max(0, eligible - processed);
      const progressPercentage = eligible > 0 ? Math.round((confirmed / eligible) * 100) : 0;

      const obj = c.toObject();
      return {
        ...obj,
        progressPercentage,
        remainingCount: remaining,
      } as any;
    });

    return {
      campaigns: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 6. Campaign Details Analytics
   */
  async getCampaignDetailsAnalytics(campaignId: string) {
    const campaign = await Campaign.findOne({
      $or: [
        { _id: campaignId.match(/^[0-9a-fA-F]{24}$/) ? campaignId : null },
        { campaignId },
      ],
    })
      .populate('companyId', 'companyName companyId jobRole industry website hrName hrPhone hrEmail')
      .populate('groupId', 'groupName groupId memberCount')
      .populate('templateId', 'name category subject language')
      .populate('createdBy', 'name email');

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Exact counts from recipients
    const [
      actualChatOpened,
      actualConfirmed,
      actualSkipped,
      actualFailed,
      actualReady,
      actualApproved,
      actualExcluded,
    ] = await Promise.all([
      CampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'CHAT_OPENED' }),
      CampaignRecipient.countDocuments({
        campaignId: campaign._id,
        status: 'SENT_MANUALLY_CONFIRMED',
      }),
      CampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'SKIPPED' }),
      CampaignRecipient.countDocuments({ campaignId: campaign._id, status: 'FAILED_TO_OPEN' }),
      CampaignRecipient.countDocuments({
        campaignId: campaign._id,
        status: { $in: ['READY', 'PENDING'] },
        isExcluded: { $ne: true },
      }),
      CampaignRecipient.countDocuments({
        campaignId: campaign._id,
        isApproved: true,
        isExcluded: { $ne: true },
      }),
      CampaignRecipient.countDocuments({ campaignId: campaign._id, isExcluded: true }),
    ]);

    // Duration calculation
    let durationFormatted = 'Not started';
    if (campaign.startedAt) {
      const end = campaign.completedAt || new Date();
      const diffMs = Math.max(0, new Date(end).getTime() - new Date(campaign.startedAt).getTime());
      const mins = Math.floor(diffMs / 60000);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      durationFormatted = hours > 0 ? `${hours}h ${remainingMins}m` : `${mins}m`;
    }

    const eligible = campaign.metrics?.eligibleRecipients || 0;
    const progressPercentage = eligible > 0 ? Math.round((actualConfirmed / eligible) * 100) : 0;

    return {
      campaign,
      durationFormatted,
      progressPercentage,
      recipientCounts: {
        total: campaign.metrics?.totalRecipients || 0,
        eligible,
        chatOpened: actualChatOpened,
        manuallyConfirmed: actualConfirmed,
        skipped: actualSkipped,
        failedToOpen: actualFailed,
        readyInQueue: actualReady,
        approved: actualApproved,
        excluded: actualExcluded,
      },
      mode: 'PERSONAL_ASSISTED',
      disclaimer:
        'WhatsApp delivery and read status cannot be independently verified in personal assisted mode.',
    };
  }

  /**
   * 7. Compare Two or More Campaigns
   */
  async compareCampaigns(campaignIds: string[]): Promise<{
    comparisons: CampaignComparisonItem[];
    disclaimer: string;
  }> {
    if (!campaignIds || campaignIds.length < 2) {
      throw new Error('Please select at least 2 campaigns for comparison.');
    }

    const cleanIds = campaignIds.slice(0, 5); // Limit comparison to at most 5 campaigns for clarity

    const campaigns = await Campaign.find({
      $or: [
        { _id: { $in: cleanIds.filter((id) => id.match(/^[0-9a-fA-F]{24}$/)) } },
        { campaignId: { $in: cleanIds } },
      ],
    }).populate('companyId', 'companyName');

    const comparisons: CampaignComparisonItem[] = [];

    for (const c of campaigns) {
      const company = c.companyId as any;
      const eligible = c.metrics?.eligibleRecipients || 0;
      const confirmed = c.metrics?.manuallyConfirmedCount || 0;
      const completionPercentage = eligible > 0 ? Math.round((confirmed / eligible) * 100) : 0;

      let durationFormatted = 'Not started';
      if (c.startedAt) {
        const end = c.completedAt || new Date();
        const diffMs = Math.max(0, new Date(end).getTime() - new Date(c.startedAt).getTime());
        const mins = Math.floor(diffMs / 60000);
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        durationFormatted = hours > 0 ? `${hours}h ${remMins}m` : `${mins}m`;
      }

      comparisons.push({
        campaignId: c.campaignId,
        name: c.name,
        companyName: company?.companyName || 'Unknown Company',
        status: c.status,
        totalRecipients: c.metrics?.totalRecipients || 0,
        eligibleRecipients: eligible,
        manuallyConfirmedCount: confirmed,
        skippedCount: c.metrics?.skippedCount || 0,
        failedCount: c.metrics?.failedCount || 0,
        completionPercentage,
        durationFormatted,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
      });
    }

    return {
      comparisons,
      disclaimer:
        'Personal WhatsApp Mode: Delivery and read status cannot be independently verified and are excluded from comparison.',
    };
  }

  /**
   * 8. Detailed Recipient Tracking Across Campaigns
   */
  async getRecipientsTracking(filters: {
    campaignId?: string;
    search?: string;
    status?: string;
    unmaskPhone?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    recipients: Array<
      ICampaignRecipient & {
        displayPhoneNumber: string;
        campaignName?: string;
        companyName?: string;
      }
    >;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.campaignId && filters.campaignId.match(/^[0-9a-fA-F]{24}$/)) {
      query.campaignId = new mongoose.Types.ObjectId(filters.campaignId);
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { candidateName: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'updatedAt';
    const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [recipients, total] = await Promise.all([
      CampaignRecipient.find(query)
        .populate('campaignId', 'name campaignId companyId')
        .populate('candidateId', 'candidateId fullName email branch collegeName passingYear')
        .populate('lastActionBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      CampaignRecipient.countDocuments(query),
    ]);

    // Populate company name via campaign
    const enrichedRecipients = await Promise.all(
      recipients.map(async (r) => {
        const campaign = r.campaignId as any;
        let companyName = 'Unknown Company';
        if (campaign && campaign.companyId) {
          const comp = await Company.findById(campaign.companyId).select('companyName');
          if (comp) companyName = comp.companyName;
        }

        const rawPhone = r.phoneNumber;
        const displayPhoneNumber = filters.unmaskPhone
          ? rawPhone
          : maskPhoneNumber(rawPhone);

        const obj = r.toObject();
        return {
          ...obj,
          displayPhoneNumber,
          campaignName: campaign?.name || 'Unknown Campaign',
          companyName,
        };
      })
    );

    return {
      recipients: enrichedRecipients as any,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const analyticsService = new AnalyticsService();
