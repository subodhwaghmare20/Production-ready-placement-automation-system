import { apiClient } from './api';
import {
  ApiResponse,
  Company,
  CompanyStats,
  CompaniesResponseData,
  CompanyFilters,
  CompanyRequirementsData,
} from '../types';

export const getCompanies = async (
  filters: CompanyFilters = {}
): Promise<CompaniesResponseData> => {
  const params: Record<string, any> = { ...filters };
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === undefined) {
      delete params[key];
    }
  });

  const response = await apiClient.get<ApiResponse<CompaniesResponseData>>('/companies', {
    params,
  });
  return response.data.data!;
};

export const getCompanyById = async (id: string): Promise<Company> => {
  const response = await apiClient.get<ApiResponse<Company>>(`/companies/${id}`);
  return response.data.data!;
};

export const createCompany = async (data: Partial<Company>): Promise<Company> => {
  const response = await apiClient.post<ApiResponse<Company>>('/companies', data);
  return response.data.data!;
};

export const updateCompany = async (
  id: string,
  data: Partial<Company>
): Promise<Company> => {
  const response = await apiClient.put<ApiResponse<Company>>(`/companies/${id}`, data);
  return response.data.data!;
};

export const deleteCompany = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/companies/${id}`);
};

export const getCompanyStats = async (): Promise<CompanyStats> => {
  const response = await apiClient.get<ApiResponse<CompanyStats>>('/companies/stats');
  return response.data.data!;
};

export const getCompanyRequirements = async (
  id: string
): Promise<CompanyRequirementsData> => {
  const response = await apiClient.get<ApiResponse<CompanyRequirementsData>>(
    `/companies/${id}/requirements`
  );
  return response.data.data!;
};

