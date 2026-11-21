import { apiClient } from './api';
import {
  ApiResponse,
  VirtualGroup,
  GroupMembership,
  GroupActivity,
  GroupStats,
  CandidateEligibilityItem,
  RecipientResolutionData,
  VirtualGroupsResponseData,
  Candidate,
} from '../types';

export const getGroups = async (
  params: Record<string, any> = {}
): Promise<VirtualGroupsResponseData> => {
  const cleanParams: Record<string, any> = { ...params };
  Object.keys(cleanParams).forEach((key) => {
    if (cleanParams[key] === '' || cleanParams[key] === undefined) {
      delete cleanParams[key];
    }
  });

  const response = await apiClient.get<ApiResponse<VirtualGroupsResponseData>>('/groups', {
    params: cleanParams,
  });
  return response.data.data!;
};

export const getGroupById = async (id: string): Promise<VirtualGroup> => {
  const response = await apiClient.get<ApiResponse<VirtualGroup>>(`/groups/${id}`);
  return response.data.data!;
};

export const createGroup = async (data: {
  groupName: string;
  companyId?: string;
  description?: string;
  candidateIds?: string[];
}): Promise<VirtualGroup> => {
  const response = await apiClient.post<ApiResponse<VirtualGroup>>('/groups', data);
  return response.data.data!;
};

export const updateGroup = async (
  id: string,
  data: Partial<VirtualGroup>
): Promise<VirtualGroup> => {
  const response = await apiClient.put<ApiResponse<VirtualGroup>>(`/groups/${id}`, data);
  return response.data.data!;
};

export const deleteGroup = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/groups/${id}`);
};

export const addGroupMembers = async (
  id: string,
  candidateIds: string[]
): Promise<{
  totalActiveMembers: number;
  newlyAdded: number;
  reactivated: number;
  alreadyActive: number;
}> => {
  const response = await apiClient.post<
    ApiResponse<{
      totalActiveMembers: number;
      newlyAdded: number;
      reactivated: number;
      alreadyActive: number;
    }>
  >(`/groups/${id}/members`, { candidateIds });
  return response.data.data!;
};

export const addSingleStudent = async (
  groupId: string,
  data: { phoneNumber: string; studentName?: string }
): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>(`/groups/${groupId}/members`, data);
  return response.data.data;
};

export const previewBulkMembers = async (
  groupId: string,
  rawText: string
): Promise<{
  totalDetected: number;
  validCount: number;
  duplicateInPasteCount: number;
  alreadyInGroupCount: number;
  invalidCount: number;
  items: Array<{
    raw: string;
    normalized: string | null;
    name?: string;
    status: 'VALID' | 'DUPLICATE_IN_PASTE' | 'ALREADY_IN_GROUP' | 'INVALID';
    reason?: string;
  }>;
}> => {
  const response = await apiClient.post<ApiResponse<any>>(`/groups/${groupId}/members/preview`, {
    rawText,
  });
  return response.data.data!;
};

export const addBulkMembers = async (
  groupId: string,
  payload: { rawText?: string; members?: Array<{ phoneNumber: string; studentName?: string }> }
): Promise<{
  newlyAdded: number;
  alreadyActive: number;
  invalidCount: number;
  totalActiveMembers: number;
}> => {
  const response = await apiClient.post<ApiResponse<any>>(`/groups/${groupId}/members`, payload);
  return response.data.data!;
};

export const getGroupMembers = async (
  id: string,
  params: Record<string, any> = {}
): Promise<{
  memberships: GroupMembership[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> => {
  const response = await apiClient.get<
    ApiResponse<{
      memberships: GroupMembership[];
      pagination: any;
    }>
  >(`/groups/${id}/members`, { params });
  return response.data.data!;
};

export const removeGroupMember = async (
  id: string,
  candidateId: string,
  reason?: string
): Promise<{ totalActiveMembers: number }> => {
  const response = await apiClient.delete<ApiResponse<{ totalActiveMembers: number }>>(
    `/groups/${id}/members/${candidateId}`,
    { data: { reason } }
  );
  return response.data.data!;
};

export const getOverallGroupStats = async (): Promise<GroupStats> => {
  const response = await apiClient.get<ApiResponse<GroupStats>>('/groups/stats');
  return response.data.data!;
};

export const getGroupStats = async (id: string): Promise<GroupStats> => {
  const response = await apiClient.get<ApiResponse<GroupStats>>(`/groups/${id}/stats`);
  return response.data.data!;
};

export const getEligibleCandidates = async (
  id: string
): Promise<{
  totalSuggested: number;
  eligibleCount: number;
  evaluations: CandidateEligibilityItem[];
}> => {
  const response = await apiClient.get<
    ApiResponse<{
      totalSuggested: number;
      eligibleCount: number;
      evaluations: CandidateEligibilityItem[];
    }>
  >(`/groups/${id}/eligible-candidates`);
  return response.data.data!;
};

export const getAvailableCandidates = async (
  id: string,
  params: Record<string, any> = {}
): Promise<{
  candidates: Candidate[];
  pagination: any;
}> => {
  const response = await apiClient.get<
    ApiResponse<{
      candidates: Candidate[];
      pagination: any;
    }>
  >(`/groups/${id}/available-candidates`, { params });
  return response.data.data!;
};

export const getRecipientResolution = async (
  id: string
): Promise<RecipientResolutionData> => {
  const response = await apiClient.get<ApiResponse<RecipientResolutionData>>(
    `/groups/${id}/recipient-resolution`
  );
  return response.data.data!;
};

export const getGroupActivities = async (id: string): Promise<GroupActivity[]> => {
  const response = await apiClient.get<ApiResponse<GroupActivity[]>>(`/groups/${id}/activities`);
  return response.data.data!;
};
