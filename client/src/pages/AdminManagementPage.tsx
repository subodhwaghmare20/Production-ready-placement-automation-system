import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Activity,
  LogOut,
  X,
  Edit2,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { AdminUser, RoleData, AuditLogData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminManagementPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showActivityModal, setShowActivityModal] = useState<boolean>(false);

  // Selected Admin
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [adminActivities, setAdminActivities] = useState<AuditLogData[]>([]);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'placement_admin',
    roleId: '',
  });

  const [resetPasswordInput, setResetPasswordInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminRes, roleRes] = await Promise.all([
        adminService.getAdmins({ page, limit: 10, search, role: roleFilter, status: statusFilter }),
        adminService.getRoles(),
      ]);
      setAdmins(adminRes.admins);
      setTotalPages(adminRes.pagination.pages || 1);
      setRoles(roleRes);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load administrators' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await adminService.createAdmin(formData);
      setMessage({ type: 'success', text: `Administrator '${formData.name}' created successfully.` });
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'placement_admin', roleId: '' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create administrator' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setMessage(null);
    setSubmitting(true);
    try {
      await adminService.updateAdmin(selectedAdmin._id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        roleId: formData.roleId || undefined,
      });
      setMessage({ type: 'success', text: 'Administrator profile updated successfully.' });
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update administrator' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    setMessage(null);
    try {
      const res = await adminService.toggleAdminStatus(admin._id, !admin.isActive);
      setMessage({
        type: 'success',
        text: `Administrator has been ${res.isActive ? 'activated' : 'deactivated'}.`,
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change administrator status' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setMessage(null);
    setSubmitting(true);
    try {
      await adminService.resetPassword(selectedAdmin._id, resetPasswordInput);
      setMessage({
        type: 'success',
        text: `Password for ${selectedAdmin.name} has been reset. All active sessions have been terminated.`,
      });
      setShowResetModal(false);
      setResetPasswordInput('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset password' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSessions = async (admin: AdminUser) => {
    if (!window.confirm(`Revoke all active sessions for ${admin.name}? They will be logged out immediately.`)) return;
    setMessage(null);
    try {
      await adminService.revokeAdminSessions(admin._id);
      setMessage({ type: 'success', text: `All active sessions revoked for ${admin.name}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke sessions' });
    }
  };

  const handleOpenActivity = async (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowActivityModal(true);
    setActivityLoading(true);
    try {
      const activities = await adminService.getAdminActivity(admin._id);
      setAdminActivities(activities);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Live password complexity checker
  const checkComplexity = (pwd: string) => {
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      num: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Administrator Management
              </h1>
              <p className="text-sm text-slate-500">
                Provision administrator accounts, assign RBAC roles, audit logins, and revoke sessions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', email: '', phone: '', password: '', role: 'placement_admin', roleId: '' });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" /> Add Administrator
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="text-sm font-medium">{message.text}</div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          >
            <option value="">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="placement_admin">Placement Admin</option>
            <option value="placement_executive">Placement Executive</option>
            <option value="viewer">Viewer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Administrators Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No administrator accounts matched your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Admin ID</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((adm) => {
                  const isSuper = adm.role === 'superadmin' || adm.role === 'Super Admin';

                  return (
                    <tr key={adm._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-slate-900">{adm.name}</div>
                        <div className="text-xs text-slate-500">{adm.email}</div>
                        {adm.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">{adm.phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {adm.adminId || 'ADM_SYSTEM'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isSuper
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {adm.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            adm.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {adm.isActive ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {adm.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {adm.lastLogin ? new Date(adm.lastLogin).toLocaleString() : 'Never logged in'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdmin(adm);
                            setFormData({
                              name: adm.name,
                              email: adm.email,
                              phone: adm.phone || '',
                              password: '',
                              role: adm.role,
                              roleId: typeof adm.roleId === 'object' ? adm.roleId?._id : adm.roleId || '',
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          title="Edit Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdmin(adm);
                            setResetPasswordInput('');
                            setShowResetModal(true);
                          }}
                          className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenActivity(adm)}
                          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition"
                          title="View Activity Trail"
                        >
                          <Activity className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRevokeSessions(adm)}
                          className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition"
                          title="Revoke Sessions"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(adm)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            adm.isActive
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {adm.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal: Add Administrator */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-700" />
                Add New Administrator
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@placement.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong password..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
                {/* Password policy checks */}
                <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px]">
                  {Object.entries(checkComplexity(formData.password)).map(([key, ok]) => (
                    <span
                      key={key}
                      className={`flex items-center gap-1 font-medium ${
                        ok ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {key === 'length' && '8+ Characters'}
                      {key === 'upper' && 'Uppercase Letter'}
                      {key === 'lower' && 'Lowercase Letter'}
                      {key === 'num' && 'Number (0-9)'}
                      {key === 'special' && 'Special Char (!@#$)'}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Role Assignment *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                >
                  <option value="placement_admin">Placement Admin</option>
                  <option value="placement_executive">Placement Executive</option>
                  <option value="viewer">Viewer</option>
                  <option value="superadmin">Super Admin (Full Unrestricted Access)</option>
                  {roles
                    .filter((r) => !['superadmin', 'placement_admin', 'placement_executive', 'viewer'].includes(r.slug))
                    .map((r) => (
                      <option key={r._id} value={r.slug}>
                        {r.name} (Custom Role)
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Administrator */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Details: {selectedAdmin.name}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none font-semibold"
                >
                  <option value="placement_admin">Placement Admin</option>
                  <option value="placement_executive">Placement Executive</option>
                  <option value="viewer">Viewer</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showResetModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Reset Password: {selectedAdmin.name}
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Resetting this password will instantly revoke all active logins and require the administrator to authenticate with their new credentials.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new strong password..."
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />

                <div className="grid grid-cols-2 gap-1 mt-2 text-[11px]">
                  {Object.entries(checkComplexity(resetPasswordInput)).map(([key, ok]) => (
                    <span
                      key={key}
                      className={`flex items-center gap-1 font-medium ${
                        ok ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {key === 'length' && '8+ Characters'}
                      {key === 'upper' && 'Uppercase'}
                      {key === 'lower' && 'Lowercase'}
                      {key === 'num' && 'Number (0-9)'}
                      {key === 'special' && 'Special Char'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                >
                  {submitting ? 'Resetting...' : 'Reset & Invalidate Sessions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: View Activity Trail */}
      {showActivityModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Activity Trail: {selectedAdmin.name}
                </h3>
                <p className="text-xs text-slate-500">{selectedAdmin.email}</p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {activityLoading ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner size="md" />
                </div>
              ) : adminActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No activity events recorded for this administrator yet.
                </p>
              ) : (
                adminActivities.map((act) => (
                  <div
                    key={act._id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{act.action}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-200/70 font-semibold text-[10px]">
                        {act.module}
                      </span>
                      {act.targetName && <span>Target: {act.targetName}</span>}
                      {act.ipAddress && <span>• IP: {act.ipAddress}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
