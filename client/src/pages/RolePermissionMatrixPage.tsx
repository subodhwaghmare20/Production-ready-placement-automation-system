import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Trash2,
  X,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { RoleData, PermissionItem } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const RolePermissionMatrixPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<{
    all: PermissionItem[];
    grouped: Record<string, PermissionItem[]>;
  }>({ all: [], grouped: {} });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom role modal
  const [showAddRoleModal, setShowAddRoleModal] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');

  // Confirmation warning
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const [roleList, permCatalog] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissionCatalog(),
      ]);
      setRoles(roleList);
      setPermissionsCatalog(permCatalog);

      if (roleList.length > 0) {
        const defaultSelected = roleList.find((r) => r.slug === 'placement_admin') || roleList[0];
        setSelectedRole(defaultSelected);
        setSelectedPermissions(defaultSelected.permissions);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load RBAC permissions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const handleSelectRole = (r: RoleData) => {
    setSelectedRole(r);
    setSelectedPermissions(r.permissions);
  };

  const handleTogglePermission = (permKey: string) => {
    if (!selectedRole || selectedRole.slug === 'superadmin') return;

    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const handleToggleCategory = (_category: string, permKeys: string[]) => {
    if (!selectedRole || selectedRole.slug === 'superadmin') return;

    const allChecked = permKeys.every((k) => selectedPermissions.includes(k));
    if (allChecked) {
      setSelectedPermissions((prev) => prev.filter((k) => !permKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...permKeys])));
    }
  };

  const handleSaveCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    // Check if sensitive administration permissions are being added
    const sensitivePerms = ['admins.create', 'admins.deactivate', 'roles.manage', 'settings.update'];
    const addsSensitive = sensitivePerms.some((sp) => selectedPermissions.includes(sp));

    if (addsSensitive && selectedRole.slug !== 'superadmin') {
      setShowWarningModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!selectedRole) return;
    setShowWarningModal(false);
    setSaving(true);
    setMessage(null);
    try {
      const updated = await adminService.updateRole(selectedRole._id, {
        permissions: selectedPermissions,
      });
      setSelectedRole(updated);
      setRoles((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      setMessage({
        type: 'success',
        text: `Permissions for role '${updated.name}' updated and enforced successfully.`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update permissions' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const newRole = await adminService.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: [],
      });
      setRoles([...roles, newRole]);
      setSelectedRole(newRole);
      setSelectedPermissions([]);
      setShowAddRoleModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setMessage({ type: 'success', text: `Custom role '${newRole.name}' created.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create role' });
    }
  };

  const handleDeleteCustomRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this custom role?')) return;
    try {
      await adminService.deleteRole(roleId);
      const remaining = roles.filter((r) => r._id !== roleId);
      setRoles(remaining);
      if (selectedRole?._id === roleId) {
        setSelectedRole(remaining[0] || null);
        setSelectedPermissions(remaining[0]?.permissions || []);
      }
      setMessage({ type: 'success', text: 'Custom role deleted successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete role' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Role-Based Access Control (RBAC) Matrix
              </h1>
              <p className="text-sm text-slate-500">
                Configure granular permissions across Candidates, Virtual Groups, Campaigns, and Admin modules
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddRoleModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Create Custom Role
        </button>
      </div>

      {/* Message Banner */}
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

      {/* Role Selection Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {roles.map((r) => {
            const isSelected = selectedRole?._id === r._id;
            const isSuper = r.slug === 'superadmin';

            return (
              <button
                key={r._id}
                onClick={() => handleSelectRole(r)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isSuper ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Shield className="w-3.5 h-3.5" />}
                <span>{r.name}</span>
                {r.isSystemRole && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    System
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Role Header & Controls */}
      {selectedRole && (
        <form onSubmit={handleSaveCheck} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{selectedRole.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono font-semibold">
                  slug: {selectedRole.slug}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {selectedRole.description || 'Custom role with tailored access.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!selectedRole.isSystemRole && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomRole(selectedRole._id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete Role
                </button>
              )}

              {selectedRole.slug !== 'superadmin' ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Super Admin role has permanent full access (*)
                </div>
              )}
            </div>
          </div>

          {/* Granular Permission Grid by Category */}
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(permissionsCatalog.grouped).map(([category, perms]) => {
                const isSuper = selectedRole.slug === 'superadmin';
                const permKeys = perms.map((p) => p.key);
                const allChecked = isSuper || permKeys.every((k) => selectedPermissions.includes(k));

                return (
                  <div
                    key={category}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{category}</h3>
                        <span className="text-[11px] text-slate-400">
                          {perms.length} permission(s)
                        </span>
                      </div>

                      {!isSuper && (
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(category, permKeys)}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                        >
                          {allChecked ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {perms.map((perm) => {
                        const checked = isSuper || selectedPermissions.includes(perm.key);

                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                              checked
                                ? 'bg-purple-50/50 border-purple-200'
                                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isSuper}
                              checked={checked}
                              onChange={() => handleTogglePermission(perm.key)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  {perm.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {perm.key}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </form>
      )}

      {/* Warning Confirmation Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-100 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Privilege Escalation
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  You are about to grant sensitive administrative or security permissions (e.g. provisioning admins, deactivating accounts, or editing system settings) to the role <strong className="text-slate-800">{selectedRole?.name}</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              All administrators assigned to this role will immediately gain these elevated privileges across the system.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                I Understand, Grant Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Role */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Custom Role</h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department Placement Coordinator"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the responsibilities and scope of this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
