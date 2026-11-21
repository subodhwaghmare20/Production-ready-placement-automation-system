import { apiClient } from './api';
import {
  ApiResponse,
  SpreadsheetPreviewData,
  SpreadsheetParsedData,
  ColumnMapping,
  Candidate,
  ManualPasteValidationData,
  CompanyMatchingData,
  AssignmentResultData,
  FetchOperationHistoryItem,
  RecipientReadinessData,
} from '../types';

export const previewSpreadsheet = async (
  file: File,
  sheet?: string
): Promise<SpreadsheetPreviewData> => {
  const formData = new FormData();
  formData.append('file', file);
  if (sheet) formData.append('sheet', sheet);

  const response = await apiClient.post<ApiResponse<SpreadsheetPreviewData>>(
    '/contact-fetcher/preview',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data.data!;
};

export const parseSpreadsheet = async (
  file: File,
  mapping: ColumnMapping,
  autoCreate: boolean = false,
  sheet?: string
): Promise<SpreadsheetParsedData> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapping', JSON.stringify(mapping));
  formData.append('autoCreate', String(autoCreate));
  if (sheet) formData.append('sheet', sheet);

  const response = await apiClient.post<ApiResponse<SpreadsheetParsedData>>(
    '/contact-fetcher/parse',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data.data!;
};

export const searchCandidates = async (
  filters: Record<string, any> = {}
): Promise<{
  candidates: Candidate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> => {
  const params: Record<string, any> = { ...filters };
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === undefined || params[key] === null) {
      delete params[key];
    }
  });

  const response = await apiClient.get<
    ApiResponse<{
      candidates: Candidate[];
      pagination: any;
    }>
  >('/contact-fetcher/candidates', { params });
  return response.data.data!;
};

export const validateNumbers = async (
  text: string
): Promise<ManualPasteValidationData> => {
  const response = await apiClient.post<ApiResponse<ManualPasteValidationData>>(
    '/contact-fetcher/validate-numbers',
    { text }
  );
  return response.data.data!;
};

export const createFromUnknown = async (
  candidates: Array<{
    fullName: string;
    phoneNumber: string;
    email?: string;
    degree?: string;
    branch?: string;
    collegeName?: string;
    passingYear?: number;
    skills?: string[];
    experienceType?: 'Fresher' | 'Experienced';
    whatsappConsent?: boolean;
    whatsappConsentSource?: string;
  }>
): Promise<{
  created: Candidate[];
  failed: Array<{ phone: string; reason: string }>;
}> => {
  const response = await apiClient.post<
    ApiResponse<{
      created: Candidate[];
      failed: Array<{ phone: string; reason: string }>;
    }>
  >('/contact-fetcher/create-from-unknown', { candidates });
  return response.data.data!;
};

export const matchCompany = async (
  candidateIds: string[],
  companyId: string
): Promise<CompanyMatchingData> => {
  const response = await apiClient.post<ApiResponse<CompanyMatchingData>>(
    '/contact-fetcher/match-company',
    {
      candidateIds,
      companyId,
    }
  );
  return response.data.data!;
};

export const assignCandidates = async (payload: {
  groupId: string;
  candidateIds: string[];
  sourceType: string;
  allowPlaced?: boolean;
  allowInactive?: boolean;
}): Promise<AssignmentResultData> => {
  const response = await apiClient.post<ApiResponse<AssignmentResultData>>(
    '/contact-fetcher/assign',
    payload
  );
  return response.data.data!;
};

export const getFetchHistory = async (
  params: Record<string, any> = {}
): Promise<{
  history: FetchOperationHistoryItem[];
  pagination: any;
}> => {
  const cleanParams: Record<string, any> = { ...params };
  Object.keys(cleanParams).forEach((key) => {
    if (cleanParams[key] === '' || cleanParams[key] === undefined) {
      delete cleanParams[key];
    }
  });

  const response = await apiClient.get<
    ApiResponse<{
      history: FetchOperationHistoryItem[];
      pagination: any;
    }>
  >('/contact-fetcher/history', { params: cleanParams });
  return response.data.data!;
};

export const getOperationDetail = async (id: string): Promise<any> => {
  const response = await apiClient.get<ApiResponse<any>>(
    `/contact-fetcher/history/${id}`
  );
  return response.data.data!;
};

export const downloadReportUrl = (operationId: string): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  return `${baseUrl}/contact-fetcher/reports/${operationId}/download`;
};

export const getRecipientReadiness = async (
  groupId: string
): Promise<RecipientReadinessData> => {
  const response = await apiClient.get<ApiResponse<RecipientReadinessData>>(
    `/contact-fetcher/recipient-readiness/${groupId}`
  );
  return response.data.data!;
};

