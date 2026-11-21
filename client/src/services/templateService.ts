import { api } from './api';
import {
  ApiResponse,
  MessageTemplate,
  MessageTemplateCategory,
  PlaceholderDefinition,
} from '../types';

export interface CreateTemplateInput {
  name: string;
  templateName?: string;
  subject?: string;
  category: MessageTemplateCategory;
  description?: string;
  content: string;
  messageBody?: string;
  language?: string;
  status?: 'Active' | 'Inactive' | 'Draft';
}

export interface UpdateTemplateInput {
  name?: string;
  templateName?: string;
  subject?: string;
  category?: MessageTemplateCategory;
  description?: string;
  content?: string;
  messageBody?: string;
  language?: string;
  status?: 'Active' | 'Inactive' | 'Draft';
  isActive?: boolean;
}

export interface GetTemplatesParams {
  category?: string;
  language?: string;
  status?: string;
  search?: string;
  isPredefined?: boolean;
  sortBy?: 'name' | 'usageCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const templateService = {
  async getTemplates(params: GetTemplatesParams = {}): Promise<MessageTemplate[]> {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'ALL') query.append('category', params.category);
    if (params.language && params.language !== 'ALL') query.append('language', params.language);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.isPredefined !== undefined) query.append('isPredefined', String(params.isPredefined));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const res = await api.get<ApiResponse<MessageTemplate[]>>(`/templates?${query.toString()}`);
    return res.data.data || [];
  },

  async getTemplateById(id: string): Promise<MessageTemplate> {
    const res = await api.get<ApiResponse<MessageTemplate>>(`/templates/${id}`);
    if (!res.data.data) throw new Error('Template not found');
    return res.data.data;
  },

  async createTemplate(data: CreateTemplateInput): Promise<MessageTemplate> {
    const res = await api.post<ApiResponse<MessageTemplate>>('/templates', data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to create template');
    return res.data.data;
  },

  async updateTemplate(id: string, data: UpdateTemplateInput): Promise<MessageTemplate> {
    const res = await api.put<ApiResponse<MessageTemplate>>(`/templates/${id}`, data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update template');
    return res.data.data;
  },

  async duplicateTemplate(id: string): Promise<MessageTemplate> {
    const res = await api.post<ApiResponse<MessageTemplate>>(`/templates/${id}/duplicate`);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to duplicate template');
    return res.data.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await api.delete<ApiResponse>(`/templates/${id}`);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to delete template');
  },

  async validateTemplate(content: string): Promise<{
    validPlaceholders: string[];
    invalidPlaceholders: string[];
    allFound: string[];
    isClean: boolean;
  }> {
    const res = await api.post<
      ApiResponse<{
        validPlaceholders: string[];
        invalidPlaceholders: string[];
        allFound: string[];
        isClean: boolean;
      }>
    >('/templates/validate', { content });
    return res.data.data || { validPlaceholders: [], invalidPlaceholders: [], allFound: [], isClean: true };
  },

  async previewTemplate(
    content: string,
    options: {
      candidateId?: string;
      companyId?: string;
      metadata?: any;
    } = {}
  ): Promise<{
    personalizedMessage: string;
    missingFields: string[];
    validationErrors: string[];
    status: 'VALID' | 'WARNING_MISSING_DATA' | 'INVALID_PLACEHOLDERS';
    variablesUsed: Record<string, string>;
  }> {
    const res = await api.post<ApiResponse<any>>('/templates/preview', {
      content,
      ...options,
    });
    return (
      res.data.data || {
        personalizedMessage: content,
        missingFields: [],
        validationErrors: [],
        status: 'VALID',
        variablesUsed: {},
      }
    );
  },

  async getPlaceholders(): Promise<PlaceholderDefinition[]> {
    const res = await api.get<ApiResponse<PlaceholderDefinition[]>>('/templates/placeholders');
    return res.data.data || [];
  },

  async exportTemplates(ids?: string[]): Promise<any> {
    const query = ids && ids.length > 0 ? `?ids=${ids.join(',')}` : '';
    const res = await api.get<ApiResponse<any>>(`/templates/export${query}`);
    return res.data.data;
  },

  async importTemplates(
    templates: any[],
    overwrite: boolean = false
  ): Promise<{ importedCount: number; skippedCount: number; errors: string[] }> {
    const res = await api.post<
      ApiResponse<{ importedCount: number; skippedCount: number; errors: string[] }>
    >('/templates/import', { templates, overwrite });
    return res.data.data || { importedCount: 0, skippedCount: 0, errors: [] };
  },
};
