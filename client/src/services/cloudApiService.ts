import { api } from './api';
import {
  ApiResponse,
  WhatsAppCloudConfigData,
  MetaTemplate,
  WebhookEventData,
  InboundMessageData,
  SuppressionRecord,
} from '../types';

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  connectionStatus: string;
  details?: {
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
    wabaName?: string;
    isMockMode?: boolean;
  };
  error?: string;
}

export interface WebhookEventsResponse {
  events: WebhookEventData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface InboundMessagesResponse {
  messages: InboundMessageData[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CampaignValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalEligible: number;
  suppressedCount: number;
  noConsentCount: number;
  readyToSendCount: number;
}

export const cloudApiService = {
  // Connection Settings
  async getConnectionSettings(): Promise<WhatsAppCloudConfigData> {
    const res = await api.get<ApiResponse<WhatsAppCloudConfigData>>('/whatsapp/cloud-api/connection');
    if (!res.data.data) throw new Error('Failed to load Cloud API settings');
    return res.data.data;
  },

  async updateConnectionSettings(
    data: Partial<WhatsAppCloudConfigData>
  ): Promise<WhatsAppCloudConfigData> {
    const res = await api.put<ApiResponse<WhatsAppCloudConfigData>>(
      '/whatsapp/cloud-api/connection',
      data
    );
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update settings');
    return res.data.data;
  },

  async testConnection(customCreds?: any): Promise<TestConnectionResponse> {
    const res = await api.post<ApiResponse<TestConnectionResponse>>(
      '/whatsapp/cloud-api/test-connection',
      customCreds || {}
    );
    return res.data.data || (res.data as any);
  },

  async resetConnectionSettings(): Promise<WhatsAppCloudConfigData> {
    const res = await api.delete<ApiResponse<WhatsAppCloudConfigData>>(
      '/whatsapp/cloud-api/connection'
    );
    if (!res.data.data) throw new Error('Failed to reset settings');
    return res.data.data;
  },

  // Meta Templates
  async getMetaTemplates(): Promise<MetaTemplate[]> {
    const res = await api.get<ApiResponse<MetaTemplate[]>>('/whatsapp/cloud-api/templates');
    return res.data.data || [];
  },

  async syncMetaTemplates(): Promise<{ message: string; templates: MetaTemplate[] }> {
    const res = await api.post<ApiResponse<MetaTemplate[]>>('/whatsapp/cloud-api/templates/sync');
    return {
      message: res.data.message || 'Templates synced successfully',
      templates: res.data.data || [],
    };
  },

  async getMetaTemplateById(id: string): Promise<MetaTemplate> {
    const res = await api.get<ApiResponse<MetaTemplate>>(`/whatsapp/cloud-api/templates/${id}`);
    if (!res.data.data) throw new Error('Template not found');
    return res.data.data;
  },

  // Webhook Events
  async getWebhookEvents(params?: {
    page?: number;
    limit?: number;
    eventType?: string;
    processingStatus?: string;
  }): Promise<WebhookEventsResponse> {
    const res = await api.get<ApiResponse<WebhookEventsResponse>>(
      '/whatsapp/cloud-api/webhook-events',
      { params }
    );
    return res.data.data || { events: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  },

  async getWebhookEventById(id: string): Promise<WebhookEventData> {
    const res = await api.get<ApiResponse<WebhookEventData>>(
      `/whatsapp/cloud-api/webhook-events/${id}`
    );
    if (!res.data.data) throw new Error('Event not found');
    return res.data.data;
  },

  async reprocessWebhookEvent(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<ApiResponse<any>>(
      `/whatsapp/cloud-api/webhook-events/${id}/reprocess`
    );
    return {
      success: res.data.success,
      message: res.data.message || 'Event reprocessed',
    };
  },

  // Inbound Messages
  async getInboundMessages(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<InboundMessagesResponse> {
    const res = await api.get<ApiResponse<InboundMessagesResponse>>(
      '/whatsapp/cloud-api/inbound-messages',
      { params }
    );
    return (
      res.data.data || {
        messages: [],
        unreadCount: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      }
    );
  },

  async updateInboundMessageStatus(id: string, status: string): Promise<InboundMessageData> {
    const res = await api.patch<ApiResponse<InboundMessageData>>(
      `/whatsapp/cloud-api/inbound-messages/${id}`,
      { status }
    );
    if (!res.data.data) throw new Error('Failed to update message status');
    return res.data.data;
  },

  async linkCandidateToMessage(id: string, candidateId: string): Promise<InboundMessageData> {
    const res = await api.post<ApiResponse<InboundMessageData>>(
      `/whatsapp/cloud-api/inbound-messages/${id}/link-candidate`,
      { candidateId }
    );
    if (!res.data.data) throw new Error('Failed to link candidate');
    return res.data.data;
  },

  // Suppressions
  async getSuppressions(): Promise<SuppressionRecord[]> {
    const res = await api.get<ApiResponse<SuppressionRecord[]>>(
      '/whatsapp/cloud-api/suppressions'
    );
    return res.data.data || [];
  },

  async addSuppression(phoneNumber: string, reason?: string): Promise<SuppressionRecord> {
    const res = await api.post<ApiResponse<SuppressionRecord>>(
      '/whatsapp/cloud-api/suppressions',
      { phoneNumber, reason }
    );
    if (!res.data.data) throw new Error('Failed to add suppression');
    return res.data.data;
  },

  async removeSuppression(id: string): Promise<void> {
    await api.delete(`/whatsapp/cloud-api/suppressions/${id}`);
  },

  // Cloud Campaign Execution
  async validateCampaign(campaignId: string): Promise<CampaignValidationResponse> {
    const res = await api.post<ApiResponse<CampaignValidationResponse>>(
      `/whatsapp/cloud-api/campaigns/${campaignId}/validate`
    );
    if (!res.data.data) throw new Error('Failed to validate campaign');
    return res.data.data;
  },

  async startCampaign(
    campaignId: string,
    options?: { batchSize?: number; delayMs?: number }
  ): Promise<any> {
    const res = await api.post<ApiResponse<any>>(
      `/whatsapp/cloud-api/campaigns/${campaignId}/start`,
      options || {}
    );
    return res.data.data;
  },

  async pauseCampaign(campaignId: string): Promise<void> {
    await api.post(`/whatsapp/cloud-api/campaigns/${campaignId}/pause`);
  },

  async resumeCampaign(campaignId: string): Promise<void> {
    await api.post(`/whatsapp/cloud-api/campaigns/${campaignId}/resume`);
  },

  async cancelCampaign(campaignId: string): Promise<void> {
    await api.post(`/whatsapp/cloud-api/campaigns/${campaignId}/cancel`);
  },
};
