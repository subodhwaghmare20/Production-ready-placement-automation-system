import mongoose from 'mongoose';
import {
  CampaignActivity,
  CampaignEventType,
  ICampaignActivity,
} from '../models/CampaignActivity.model';

export interface LogActivityParams {
  campaignId: string | mongoose.Types.ObjectId;
  recipientId?: string | mongoose.Types.ObjectId;
  candidateName?: string;
  eventType: CampaignEventType;
  description: string;
  performedBy?: string | mongoose.Types.ObjectId;
  performedByName?: string;
  metadata?: Record<string, unknown>;
}

export class ActivityService {
  /**
   * Log a campaign activity with duplicate event prevention
   */
  async logActivity(params: LogActivityParams): Promise<ICampaignActivity | null> {
    try {
      const campaignObjectId =
        typeof params.campaignId === 'string'
          ? new mongoose.Types.ObjectId(params.campaignId)
          : params.campaignId;

      const recipientObjectId = params.recipientId
        ? typeof params.recipientId === 'string'
          ? new mongoose.Types.ObjectId(params.recipientId)
          : params.recipientId
        : undefined;

      // Duplicate event prevention: if an identical event occurred within the past 3 seconds, skip logging
      const threeSecondsAgo = new Date(Date.now() - 3000);
      const duplicateQuery: Record<string, unknown> = {
        campaignId: campaignObjectId,
        eventType: params.eventType,
        timestamp: { $gte: threeSecondsAgo },
      };
      if (recipientObjectId) {
        duplicateQuery.recipientId = recipientObjectId;
      }

      const existingEvent = await CampaignActivity.findOne(duplicateQuery);
      if (existingEvent) {
        return existingEvent;
      }

      const performedByObjectId = params.performedBy
        ? typeof params.performedBy === 'string'
          ? new mongoose.Types.ObjectId(params.performedBy)
          : params.performedBy
        : undefined;

      const activity = await CampaignActivity.create({
        campaignId: campaignObjectId,
        recipientId: recipientObjectId,
        candidateName: params.candidateName,
        eventType: params.eventType,
        description: params.description.trim(),
        performedBy: performedByObjectId,
        performedByName: params.performedByName || 'Administrator',
        timestamp: new Date(),
        metadata: params.metadata,
      });

      return activity;
    } catch (error) {
      console.error('Failed to log campaign activity event:', error);
      return null;
    }
  }

  /**
   * Get timeline for a specific campaign with sorting, filtering & pagination
   */
  async getCampaignTimeline(
    campaignId: string,
    options: {
      eventType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    activities: ICampaignActivity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 30));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      campaignId: campaignId.match(/^[0-9a-fA-F]{24}$/)
        ? new mongoose.Types.ObjectId(campaignId)
        : campaignId,
    };

    if (options.eventType && options.eventType !== 'ALL') {
      query.eventType = options.eventType;
    }

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        (query.timestamp as Record<string, unknown>).$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        (query.timestamp as Record<string, unknown>).$lte = new Date(options.endDate);
      }
    }

    const [activities, total] = await Promise.all([
      CampaignActivity.find(query)
        .populate('performedBy', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      CampaignActivity.countDocuments(query),
    ]);

    return {
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get recent activities across all campaigns
   */
  async getRecentActivities(limit = 15): Promise<ICampaignActivity[]> {
    return CampaignActivity.find()
      .populate('campaignId', 'name campaignId')
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(Math.min(50, limit));
  }
}

export const activityService = new ActivityService();
