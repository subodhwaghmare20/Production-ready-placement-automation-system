import { apiClient } from './api';
import {
  ApiResponse,
  Candidate,
  CandidateStats,
  CandidatesResponseData,
  CandidateFilters,
  BulkImportPreviewData,
  BulkImportConfirmResult,
} from '../types';

export const getCandidates = async (
  filters: CandidateFilters = {}
): Promise<CandidatesResponseData> => {
  const params: Record<string, any> = { ...filters };
  // Remove empty strings
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === undefined) {
      delete params[key];
    }
  });

  const response = await apiClient.get<ApiResponse<CandidatesResponseData>>('/candidates', {
    params,
  });
  return response.data.data!;
};

export const getCandidateById = async (id: string): Promise<Candidate> => {
  const response = await apiClient.get<ApiResponse<Candidate>>(`/candidates/${id}`);
  return response.data.data!;
};

export const createCandidate = async (
  data: Partial<Candidate>
): Promise<Candidate> => {
  const response = await apiClient.post<ApiResponse<Candidate>>('/candidates', data);
  return response.data.data!;
};

export const updateCandidate = async (
  id: string,
  data: Partial<Candidate>
): Promise<Candidate> => {
  const response = await apiClient.put<ApiResponse<Candidate>>(`/candidates/${id}`, data);
  return response.data.data!;
};

export const deleteCandidate = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/candidates/${id}`);
};

export const getCandidateStats = async (): Promise<CandidateStats> => {
  const response = await apiClient.get<ApiResponse<CandidateStats>>('/candidates/stats');
  return response.data.data!;
};

export const uploadResume = async (
  file: File
): Promise<{ filename: string; originalName: string; mimetype: string; size: number }> => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await apiClient.post<
    ApiResponse<{ filename: string; originalName: string; mimetype: string; size: number }>
  >('/candidates/upload-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data!;
};

export const getResumeDownloadUrl = (candidateId: string): string => {
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  return `${baseUrl}/candidates/${candidateId}/resume`;
};

export const downloadSampleTemplate = async (format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> => {
  const response = await apiClient.get(`/candidates/sample-template?format=${format}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `candidate_import_sample.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportCandidates = async (
  filters: CandidateFilters = {},
  format: 'xlsx' | 'csv' = 'xlsx'
): Promise<void> => {
  const params = { ...filters, format };
  const response = await apiClient.get('/candidates/export', {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `candidates_export_${timestamp}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const previewBulkImport = async (file: File): Promise<BulkImportPreviewData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<BulkImportPreviewData>>(
    '/candidates/bulk-import/preview',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data!;
};

export const confirmBulkImport = async (
  records: Partial<Candidate>[]
): Promise<BulkImportConfirmResult> => {
  const response = await apiClient.post<ApiResponse<BulkImportConfirmResult>>(
    '/candidates/bulk-import/confirm',
    { records }
  );
  return response.data.data!;
};

export const exportRejectedReport = async (
  rejectedRecords: { rowNumber: number; data: Record<string, any>; reason: string }[]
): Promise<void> => {
  const response = await apiClient.post(
    '/candidates/bulk-import/export-rejected',
    { rejectedRecords },
    { responseType: 'blob' }
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'import_rejection_report.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

