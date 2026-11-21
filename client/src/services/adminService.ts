import { api } from './api';
import {
  ApiResponse,
  AdminUser,
  RoleData,
  PermissionItem,
  AuditLogData,
  AdminSessionData,
  SystemSettingsData,
  SystemStatsData,
} from '../types';

export const adminService = {
  // --- Admin User Management ---
  async getAdmins(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ admins: AdminUser[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const res = await api.get<ApiResponse<{ admins: AdminUser[]; pagination: any }>>('/admins', { params });
    return res.data.data || { admins: [], pagination: { page: 1, limit: 15, total: 0, pages: 0 } };
  },

  async getAdminById(id: string): Promise<AdminUser> {
    const res = await api.get<ApiResponse<AdminUser>>(`/admins/${id}`);
    if (!res.data.data) throw new Error('Administrator not found');
    return res.data.data;
  },

  async createAdmin(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
    roleId?: string;
    customPermissions?: string[];
  }): Promise<AdminUser> {
    const res = await api.post<ApiResponse<AdminUser>>('/admins', data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to create administrator');
    return res.data.data;
  },

  async updateAdmin(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      roleId?: string;
      customPermissions?: string[];
    }
  ): Promise<AdminUser> {
    const res = await api.put<ApiResponse<AdminUser>>(`/admins/${id}`, data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update administrator');
    return res.data.data;
  },

  async toggleAdminStatus(id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
    const res = await api.patch<ApiResponse<{ id: string; isActive: boolean }>>(`/admins/${id}/status`, { isActive });
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update administrator status');
    return res.data.data;
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const res = await api.post<ApiResponse<void>>(`/admins/${id}/reset-password`, { newPassword });
    if (!res.data.success) throw new Error(res.data.message || 'Failed to reset password');
  },

  async revokeAdminSessions(id: string): Promise<void> {
    const res = await api.post<ApiResponse<void>>(`/admins/${id}/revoke-sessions`);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to revoke sessions');
  },

  async getAdminActivity(id: string, limit = 20): Promise<AuditLogData[]> {
    const res = await api.get<ApiResponse<AuditLogData[]>>(`/admins/${id}/activity`, { params: { limit } });
    return res.data.data || [];
  },

  // --- Roles & Permissions ---
  async getRoles(): Promise<RoleData[]> {
    const res = await api.get<ApiResponse<RoleData[]>>('/roles');
    return res.data.data || [];
  },

  async getPermissionCatalog(): Promise<{ all: PermissionItem[]; grouped: Record<string, PermissionItem[]> }> {
    const res = await api.get<ApiResponse<{ all: PermissionItem[]; grouped: Record<string, PermissionItem[]> }>>(
      '/roles/permissions'
    );
    return res.data.data || { all: [], grouped: {} };
  },

  async createRole(data: { name: string; description?: string; permissions: string[] }): Promise<RoleData> {
    const res = await api.post<ApiResponse<RoleData>>('/roles', data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to create role');
    return res.data.data;
  },

  async updateRole(
    id: string,
    data: { name?: string; description?: string; permissions: string[] }
  ): Promise<RoleData> {
    const res = await api.put<ApiResponse<RoleData>>(`/roles/${id}`, data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update role');
    return res.data.data;
  },

  async deleteRole(id: string): Promise<void> {
    const res = await api.delete<ApiResponse<void>>(`/roles/${id}`);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to delete role');
  },

  // --- Audit Logs ---
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    actorId?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ logs: AuditLogData[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const res = await api.get<ApiResponse<{ logs: AuditLogData[]; pagination: any }>>('/audit-logs', { params });
    return res.data.data || { logs: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  },

  async getAuditLogById(id: string): Promise<AuditLogData> {
    const res = await api.get<ApiResponse<AuditLogData>>(`/audit-logs/${id}`);
    if (!res.data.data) throw new Error('Audit log not found');
    return res.data.data;
  },

  async exportAuditLogsCsv(params?: any): Promise<Blob> {
    const res = await api.get('/audit-logs/export/csv', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  // --- System Settings ---
  async getSystemSettings(): Promise<SystemSettingsData> {
    const res = await api.get<ApiResponse<SystemSettingsData>>('/settings/system');
    if (!res.data.data) throw new Error('Failed to load system settings');
    return res.data.data;
  },

  async updateSystemSettings(data: Partial<SystemSettingsData>): Promise<SystemSettingsData> {
    const res = await api.put<ApiResponse<SystemSettingsData>>('/settings/system', data);
    if (!res.data.data) throw new Error(res.data.message || 'Failed to update settings');
    return res.data.data;
  },

  async getSystemStats(): Promise<SystemStatsData> {
    const res = await api.get<ApiResponse<SystemStatsData>>('/settings/system/stats');
    if (!res.data.data) throw new Error('Failed to load system health');
    return res.data.data;
  },

  // --- Active Session Management ---
  async getMySessions(): Promise<AdminSessionData[]> {
    const res = await api.get<ApiResponse<AdminSessionData[]>>('/sessions/my-sessions');
    return res.data.data || [];
  },

  async revokeSession(sessionId: string): Promise<void> {
    const res = await api.post<ApiResponse<void>>(`/sessions/revoke/${sessionId}`);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to revoke session');
  },

  async revokeAllOtherSessions(): Promise<{ revokedCount: number }> {
    const res = await api.post<ApiResponse<{ revokedCount: number }>>('/sessions/revoke-all-others');
    return res.data.data || { revokedCount: 0 };
  },
};
