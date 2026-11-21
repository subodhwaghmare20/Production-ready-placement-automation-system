import { api } from './api';
import {
  ApiResponse,
  WhatsAppCampaign,
  CampaignRecipient,
  WhatsAppDashboardStats,
  WhatsAppCampaignStatus,
  CampaignMetadata,
} from '../types';

export interface CreateCampaignRequest {
  name: string;
  companyId: string;
  groupId: string;
  templateId?: string;
  metaTemplateId?: string;
  metaTemplateName?: string;
  provider?: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  messageType?: 'TEMPLATE' | 'TEXT';
  messageContent: string;
  metadata?: CampaignMetadata;
}

export interface PreviewAudienceResponse {
  group: {
    _id: string;
    groupName: string;
    groupId: string;
    companyId: {
      _id: string;
      companyName: string;
      jobRole: string;
    };
  };
  totalMembers: number;
  consentedCount: number;
  unconsentedCount: number;
  eligibleCount: number;
  sampleRecipients: Array<{
    id: string;
    name: string;
    phone: string;
    consent: boolean;
    status: string;
  }>;
}

export interface GetCampaignsResponse {
  campaigns: WhatsAppCampaign[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GetCampaignRecipientsResponse {
  recipients: CampaignRecipient[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GetNextRecipientResponse {
  campaign: WhatsAppCampaign;
  recipient: CampaignRecipient | null;
  currentIndex: number;
  totalEligible: number;
  remainingCount: number;
}

export const campaignService = {
  async getDashboardStats(): Promise<WhatsAppDashboardStats> {
    const res = await api.get<ApiResponse<WhatsAppDashboardStats>>('/campaigns/stats');
    if (!res.data.data) throw new Error('Failed to load WhatsApp dashboard stats');
    return res.data.data;
  },

  async previewAudience(groupId: string): Promise<PreviewAudienceResponse> {
    const res = await api.get<ApiResponse<PreviewAudienceResponse>>(`/campaigns/preview-audience/${groupId}`);
    if (!res.data.data) throw new Error('Failed to preview audience readiness');
    return res.data.data;
  },

  async createCampaign(data: CreateCampaignRequest): Promise<{
    campaign: WhatsAppCampaign;
    eligibleRecipients: CampaignRecipient[];
  }> {
    const res = await api.post<ApiResponse<{
      campaign: WhatsAppCampaign;
      eligibleRecipients: CampaignRecipient[];
    }>>('/campaigns', data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to prepare campaign');
    return res.data.data;
  },

  async getCampaigns(params?: {
    status?: WhatsAppCampaignStatus;
    companyId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<GetCampaignsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.companyId) query.append('companyId', params.companyId);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await api.get<ApiResponse<GetCampaignsResponse>>(`/campaigns?${query.toString()}`);
    return res.data.data || { campaigns: [], total: 0, page: 1, totalPages: 1 };
  },

  async getCampaignById(id: string): Promise<WhatsAppCampaign> {
    const res = await api.get<ApiResponse<WhatsAppCampaign>>(`/campaigns/${id}`);
    if (!res.data.data) throw new Error('Campaign not found');
    return res.data.data;
  },

  async getCampaignRecipients(
    campaignId: string,
    filtersOrStatus?:
      | string
      | {
          status?: string;
          personalizationStatus?: string;
          isApproved?: boolean;
          isExcluded?: boolean;
          page?: number;
          limit?: number;
        },
    page: number = 1,
    limit: number = 50
  ): Promise<GetCampaignRecipientsResponse> {
    const query = new URLSearchParams();
    if (typeof filtersOrStatus === 'string') {
      if (filtersOrStatus && filtersOrStatus !== 'ALL') query.append('status', filtersOrStatus);
      query.append('page', page.toString());
      query.append('limit', limit.toString());
    } else if (typeof filtersOrStatus === 'object' && filtersOrStatus !== null) {
      if (filtersOrStatus.status && filtersOrStatus.status !== 'ALL')
        query.append('status', filtersOrStatus.status);
      if (filtersOrStatus.personalizationStatus && filtersOrStatus.personalizationStatus !== 'ALL')
        query.append('personalizationStatus', filtersOrStatus.personalizationStatus);
      if (filtersOrStatus.isApproved !== undefined)
        query.append('isApproved', String(filtersOrStatus.isApproved));
      if (filtersOrStatus.isExcluded !== undefined)
        query.append('isExcluded', String(filtersOrStatus.isExcluded));
      query.append('page', (filtersOrStatus.page || 1).toString());
      query.append('limit', (filtersOrStatus.limit || 50).toString());
    } else {
      query.append('page', page.toString());
      query.append('limit', limit.toString());
    }

    const res = await api.get<ApiResponse<GetCampaignRecipientsResponse>>(
      `/campaigns/${campaignId}/recipients?${query.toString()}`
    );
    return res.data.data || { recipients: [], total: 0, page: 1, totalPages: 1 };
  },

  async getNextRecipient(campaignId: string): Promise<GetNextRecipientResponse> {
    const res = await api.get<ApiResponse<GetNextRecipientResponse>>(`/campaigns/${campaignId}/next`);
    if (!res.data.data) throw new Error('Failed to get next recipient');
    return res.data.data;
  },

  async markChatOpened(campaignId: string, recipientId: string): Promise<CampaignRecipient> {
    const res = await api.post<ApiResponse<CampaignRecipient>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/open-chat`
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to record chat opened');
    return res.data.data;
  },

  async confirmManualSend(
    campaignId: string,
    recipientId: string,
    notes?: string
  ): Promise<{ recipient: CampaignRecipient; campaign: WhatsAppCampaign; isCompleted: boolean }> {
    const res = await api.post<ApiResponse<{
      recipient: CampaignRecipient;
      campaign: WhatsAppCampaign;
      isCompleted: boolean;
    }>>(`/campaigns/${campaignId}/recipients/${recipientId}/confirm-sent`, { notes });
    if (!res.data.data) throw new Error(res.data.message || 'Failed to confirm manual dispatch');
    return res.data.data;
  },

  async skipRecipient(
    campaignId: string,
    recipientId: string,
    skipReason?: string
  ): Promise<{ recipient: CampaignRecipient; campaign: WhatsAppCampaign; isCompleted: boolean }> {
    const res = await api.post<ApiResponse<{
      recipient: CampaignRecipient;
      campaign: WhatsAppCampaign;
      isCompleted: boolean;
    }>>(`/campaigns/${campaignId}/recipients/${recipientId}/skip`, { skipReason });
    if (!res.data.data) throw new Error(res.data.message || 'Failed to skip recipient');
    return res.data.data;
  },

  async updateCampaignStatus(
    campaignId: string,
    status: 'PAUSED' | 'IN_PROGRESS' | 'CANCELLED'
  ): Promise<WhatsAppCampaign> {
    const res = await api.patch<ApiResponse<WhatsAppCampaign>>(`/campaigns/${campaignId}/status`, {
      status,
    });
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update campaign status');
    return res.data.data;
  },

  // Module 8: Personalization & Campaign Validation
  async getValidationSummary(campaignId: string): Promise<any> {
    const res = await api.get<ApiResponse<any>>(`/campaigns/${campaignId}/validation-summary`);
    if (!res.data.data) throw new Error('Failed to load validation summary');
    return res.data.data;
  },

  async getRecipientPreview(campaignId: string, recipientId: string): Promise<any> {
    const res = await api.get<ApiResponse<any>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/preview`
    );
    if (!res.data.data) throw new Error('Failed to load recipient preview');
    return res.data.data;
  },

  async updateRecipientMessage(
    campaignId: string,
    recipientId: string,
    message: string
  ): Promise<CampaignRecipient> {
    const res = await api.put<ApiResponse<CampaignRecipient>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/message`,
      { message }
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update candidate message');
    return res.data.data;
  },

  async resetRecipientMessage(campaignId: string, recipientId: string): Promise<CampaignRecipient> {
    const res = await api.post<ApiResponse<CampaignRecipient>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/reset`
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to reset candidate message');
    return res.data.data;
  },

  async approveRecipient(campaignId: string, recipientId: string): Promise<CampaignRecipient> {
    const res = await api.post<ApiResponse<CampaignRecipient>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/approve`
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to approve recipient');
    return res.data.data;
  },

  async excludeRecipient(
    campaignId: string,
    recipientId: string,
    reason?: string
  ): Promise<CampaignRecipient> {
    const res = await api.post<ApiResponse<CampaignRecipient>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/exclude`,
      { reason }
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to exclude recipient');
    return res.data.data;
  },

  async approveAllValid(campaignId: string): Promise<{ approvedCount: number }> {
    const res = await api.post<ApiResponse<{ approvedCount: number }>>(
      `/campaigns/${campaignId}/approve-all-valid`
    );
    return res.data.data || { approvedCount: 0 };
  },

  async excludeAllIncomplete(campaignId: string, reason?: string): Promise<{ excludedCount: number }> {
    const res = await api.post<ApiResponse<{ excludedCount: number }>>(
      `/campaigns/${campaignId}/exclude-all-incomplete`,
      { reason }
    );
    return res.data.data || { excludedCount: 0 };
  },

  async markChatFailed(
    campaignId: string,
    recipientId: string,
    errorDetails?: string
  ): Promise<{ recipient: CampaignRecipient; campaign: WhatsAppCampaign }> {
    const res = await api.post<ApiResponse<{ recipient: CampaignRecipient; campaign: WhatsAppCampaign }>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/mark-failed`,
      { errorDetails }
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to record chat failure');
    return res.data.data;
  },

  async retryRecipient(campaignId: string, recipientId: string): Promise<CampaignRecipient> {
    const res = await api.post<ApiResponse<CampaignRecipient>>(
      `/campaigns/${campaignId}/recipients/${recipientId}/retry`
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to retry recipient');
    return res.data.data;
  },
};

