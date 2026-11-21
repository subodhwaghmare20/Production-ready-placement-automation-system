import { apiClient } from './api';
import { ApiResponse, AdminUser } from '../types';

export interface LoginResponseData {
  admin: AdminUser;
  csrfToken: string;
}

export const loginAdmin = async (
  email: string,
  password: string
): Promise<LoginResponseData> => {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
    email,
    password,
  });
  return response.data.data!;
};

export const logoutAdmin = async (): Promise<void> => {
  await apiClient.post<ApiResponse<void>>('/auth/logout');
};

export const getAdminProfile = async (): Promise<AdminUser> => {
  const response = await apiClient.get<ApiResponse<{ admin: AdminUser }>>('/auth/me');
  return response.data.data!.admin;
};

