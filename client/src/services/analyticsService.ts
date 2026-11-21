import { api } from './api';
import {
  OverviewStats,
  CampaignTrendItem,
  RecipientStatusDistribution,
  CompanyPerformanceItem,
  CampaignComparisonItem,
  CampaignActivity,
  CampaignRecipient,
  WhatsAppCampaign,
} from '../types';

export interface CampaignAnalyticsListResponse {
  campaigns: Array<WhatsAppCampaign & { progressPercentage: number; remainingCount: number }>;
  total: number;
  page: number;
  totalPages: number;
}

export interface RecipientTrackingResponse {
  recipients: Array<
    CampaignRecipient & {
      displayPhoneNumber: string;
      campaignName?: string;
      companyName?: string;
    }
  >;
  total: number;
  page: number;
  totalPages: number;
}

export interface TimelineResponse {
  activities: CampaignActivity[];
  total: number;
  page: number;
  totalPages: number;
}

export class AnalyticsService {
  async getOverview(params?: {
    startDate?: string;
    endDate?: string;
    companyId?: string;
  }): Promise<OverviewStats> {
    const res = await api.get('/analytics/overview', { params });
    return res.data.data;
  }

  async getCampaignTrends(params?: {
    interval?: 'day' | 'month';
    startDate?: string;
    endDate?: string;
  }): Promise<CampaignTrendItem[]> {
    const res = await api.get('/analytics/campaign-trends', { params });
    return res.data.data;
  }

  async getRecipientStatus(params?: {
    campaignId?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<RecipientStatusDistribution> {
    const res = await api.get('/analytics/recipient-status', { params });
    return res.data.data;
  }

  async getCompanyPerformance(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<CompanyPerformanceItem[]> {
    const res = await api.get('/analytics/company-performance', { params });
    return res.data.data;
  }

  async getCampaigns(params?: {
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
  }): Promise<CampaignAnalyticsListResponse> {
    const res = await api.get('/analytics/campaigns', { params });
    return res.data;
  }

  async getCampaignById(id: string): Promise<{
    campaign: WhatsAppCampaign;
    durationFormatted: string;
    progressPercentage: number;
    recipientCounts: {
      total: number;
      eligible: number;
      chatOpened: number;
      manuallyConfirmed: number;
      skipped: number;
      failedToOpen: number;
      readyInQueue: number;
      approved: number;
      excluded: number;
    };
    mode: string;
    disclaimer: string;
  }> {
    const res = await api.get(`/analytics/campaigns/${id}`);
    return res.data.data;
  }

  async getCampaignTimeline(
    campaignId: string,
    params?: {
      eventType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<TimelineResponse> {
    const res = await api.get(`/analytics/campaigns/${campaignId}/timeline`, { params });
    return res.data;
  }

  async compareCampaigns(campaignIds: string[]): Promise<{
    comparisons: CampaignComparisonItem[];
    disclaimer: string;
  }> {
    const res = await api.get('/analytics/campaigns/compare', {
      params: { ids: campaignIds.join(',') },
    });
    return res.data;
  }

  async getRecipients(params?: {
    campaignId?: string;
    search?: string;
    status?: string;
    unmaskPhone?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<RecipientTrackingResponse> {
    const res = await api.get('/analytics/recipients', { params });
    return res.data;
  }

  /**
   * Triggers download of generated report in specified format
   */
  async downloadReport(
    reportType:
      | 'campaign-summary'
      | 'recipient-details'
      | 'company-performance'
      | 'monthly-activity'
      | 'failed-skipped',
    format: 'xlsx' | 'csv' | 'pdf',
    filters?: Record<string, any>
  ): Promise<void> {
    const res = await api.get(`/reports/${reportType}`, {
      params: { ...filters, format },
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition header if available
    let filename = `${reportType}_report_${Date.now()}.${format}`;
    const disposition = res.headers['content-disposition'] as string | undefined;
    if (disposition && typeof disposition === 'string' && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const contentType = (res.headers['content-type'] as string) || 'application/octet-stream';
    const blob = new Blob([res.data], {
      type: contentType,
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const analyticsService = new AnalyticsService();
