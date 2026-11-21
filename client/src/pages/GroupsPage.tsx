import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderTree,
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  Send,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { getGroups, createGroup, updateGroup, deleteGroup } from '../services/groupService';
import { VirtualGroup } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<VirtualGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VirtualGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<VirtualGroup | null>(null);

  // Form states
  const [formGroupName, setFormGroupName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 100 };
      if (search.trim()) params.search = search.trim();

      const res = await getGroups(params);
      setGroups(res.groups || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleOpenCreateModal = () => {
    setFormGroupName('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (group: VirtualGroup) => {
    setEditingGroup(group);
    setFormGroupName(group.groupName);
    setFormError(null);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGroupName.trim()) {
      setFormError('Please enter a group name');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      await createGroup({
        groupName: formGroupName.trim(),
      });
      setIsCreateModalOpen(false);
      fetchGroups();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    if (!formGroupName.trim()) {
      setFormError('Please enter a group name');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      await updateGroup(editingGroup._id, {
        groupName: formGroupName.trim(),
      });
      setEditingGroup(null);
      fetchGroups();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    try {
      setFormSubmitting(true);
      await deleteGroup(groupToDelete._id);
      setGroupToDelete(null);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-emerald-600" />
            Groups & Companies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create groups, add student mobile numbers, and send WhatsApp messages directly
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm gap-2 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Group
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups by name (e.g. TCS, Infosys, Batch 1)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Groups List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-3">
              <FolderTree className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No Groups Created Yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first group (e.g. TCS, Infosys, Interview Shortlist) to start adding student mobile numbers and sending WhatsApp messages.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Group / Company Name</th>
                  <th className="py-3.5 px-4 text-center">Students (Mobile #s)</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {groups.map((group) => (
                  <tr key={group._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <Link
                        to={`/groups/${group._id}`}
                        className="font-bold text-slate-900 hover:text-emerald-600 text-base flex items-center gap-2 group/name"
                      >
                        {group.groupName}
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover/name:text-emerald-500 transition-colors" />
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                        {group.memberCount || 0} students
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-xs">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/groups/${group._id}`}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Open & Message
                        </Link>
                        <button
                          onClick={() => handleOpenEditModal(group)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Rename Group"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setGroupToDelete(group)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Delete Group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Group Modal - Only 1 field required! */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-emerald-600" />
                Create New Group
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Group / Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. TCS, Infosys, Wipro Batch 1, Accenture Interview"
                  value={formGroupName}
                  onChange={(e) => setFormGroupName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Whatever group name you provide represents the company and contact list.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-emerald-600" />
                Rename Group
              </h2>
              <button
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Group / Company Name *
                </label>
                <input
                  type="text"
                  value={formGroupName}
                  onChange={(e) => setFormGroupName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Delete Group</h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{groupToDelete.groupName}"</span>?
              This will remove the group and its student list.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl flex-1 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={formSubmitting}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex-1 disabled:opacity-50 cursor-pointer"
              >
                {formSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
