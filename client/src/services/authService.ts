import { apiClient } from './api';
import { ApiResponse, AdminUser } from '../types';

export interface LoginResponseData {
  token?: string;
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
  const data = response.data.data!;
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
  }
  if (data.csrfToken) {
    localStorage.setItem('csrf_token', data.csrfToken);
  }
  return data;
};

export const logoutAdmin = async (): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<void>>('/auth/logout');
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('csrf_token');
  }
};

export const getAdminProfile = async (): Promise<AdminUser> => {
  const response = await apiClient.get<ApiResponse<{ admin: AdminUser }>>('/auth/me');
  return response.data.data!.admin;
};

