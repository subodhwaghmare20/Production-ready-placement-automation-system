import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';
import { activityService } from '../services/activity.service';

export const getOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate, companyId } = req.query;
    const stats = await analyticsService.getOverviewStats({
      startDate: startDate as string,
      endDate: endDate as string,
      companyId: companyId as string,
    });
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch analytics overview' });
  }
};

export const getCampaignTrends = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { interval, startDate, endDate } = req.query;
    const trends = await analyticsService.getCampaignTrends({
      interval: (interval as 'day' | 'month') || 'month',
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.status(200).json({ success: true, data: trends });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch campaign trends' });
  }
};

export const getRecipientStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId, companyId, startDate, endDate } = req.query;
    const distribution = await analyticsService.getRecipientStatusDistribution({
      campaignId: campaignId as string,
      companyId: companyId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.status(200).json({ success: true, data: distribution });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch recipient status distribution' });
  }
};

export const getCompanyPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const performance = await analyticsService.getCompanyPerformance({
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.status(200).json({ success: true, data: performance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch company performance' });
  }
};

export const getCampaigns = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      search,
      status,
      companyId,
      groupId,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await analyticsService.getCampaignListWithAnalytics({
      search: search as string,
      status: status as string,
      companyId: companyId as string,
      groupId: groupId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch campaigns analytics list' });
  }
};

export const getCampaignById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const details = await analyticsService.getCampaignDetailsAnalytics(id);
    res.status(200).json({ success: true, data: details });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message || 'Campaign not found' });
  }
};

export const getCampaignTimeline = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { eventType, startDate, endDate, page, limit } = req.query;

    const timeline = await activityService.getCampaignTimeline(id, {
      eventType: eventType as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 30,
    });

    res.status(200).json({ success: true, ...timeline });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch campaign timeline' });
  }
};

export const compareCampaigns = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.query;
    let campaignIds: string[] = [];

    if (typeof ids === 'string') {
      campaignIds = ids.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(ids)) {
      campaignIds = ids as string[];
    }

    if (campaignIds.length < 2) {
      res.status(400).json({
        success: false,
        message: 'At least 2 campaign IDs must be provided in the "ids" query parameter (comma-separated)',
      });
      return;
    }

    const comparison = await analyticsService.compareCampaigns(campaignIds);
    res.status(200).json({ success: true, ...comparison });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to compare campaigns' });
  }
};

export const getRecipients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { campaignId, search, status, unmaskPhone, page, limit, sortBy, sortOrder } = req.query;

    const result = await analyticsService.getRecipientsTracking({
      campaignId: campaignId as string,
      search: search as string,
      status: status as string,
      unmaskPhone: unmaskPhone === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch recipient tracking data' });
  }
};
