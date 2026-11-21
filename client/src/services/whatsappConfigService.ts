import { api } from './api';
import { ApiResponse, WhatsAppConfigData } from '../types';

export const whatsappConfigService = {
  async getSettings(): Promise<WhatsAppConfigData> {
    const res = await api.get<ApiResponse<WhatsAppConfigData>>('/whatsapp-settings');
    if (!res.data.data) throw new Error('Failed to load WhatsApp settings');
    return res.data.data;
  },

  async updateSettings(data: Partial<WhatsAppConfigData>): Promise<WhatsAppConfigData> {
    const res = await api.put<ApiResponse<WhatsAppConfigData>>('/whatsapp-settings', data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update settings');
    return res.data.data;
  },

  async testConnection(mode: 'PERSONAL_ASSISTED' | 'CLOUD_API'): Promise<{ success: boolean; message: string }> {
    const res = await api.post<ApiResponse<{ success: boolean; message: string }>>('/whatsapp-settings/test', { mode });
    return res.data.data || { success: res.data.success, message: res.data.message || '' };
  },
};

