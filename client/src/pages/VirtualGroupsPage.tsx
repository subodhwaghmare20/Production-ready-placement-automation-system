import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderTree,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Users,
  MessageSquare,
  Building2,
  CheckCircle2,
  Archive,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { getGroups, getOverallGroupStats, deleteGroup } from '../services/groupService';
import { VirtualGroup, GroupStats, GroupStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RecipientResolutionModal } from '../components/groups/RecipientResolutionModal';
import { AddMembersModal } from '../components/groups/AddMembersModal';
import { DeleteGroupModal } from '../components/groups/DeleteGroupModal';
import { EditGroupModal } from '../components/groups/EditGroupModal';

export const VirtualGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<VirtualGroup[]>([]);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [recipientResolutionGroupId, setRecipientResolutionGroupId] = useState<string | null>(null);
  const [addMembersGroup, setAddMembersGroup] = useState<VirtualGroup | null>(null);
  const [editGroup, setEditGroup] = useState<VirtualGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<VirtualGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getOverallGroupStats();
      setStats(data);
    } catch {
      // Non-fatal
    }
  };

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGroups({
        page,
        limit,
        search,
        status: statusFilter,
      });
      setGroups(res.groups);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load virtual recruitment groups.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    try {
      setIsDeleting(true);
      await deleteGroup(groupToDelete._id);
      setGroupToDelete(null);
      fetchGroups();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: GroupStatus) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Archived':
        return <Badge variant="default">Archived</Badge>;
      case 'Completed':
        return <Badge variant="info">Completed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Virtual Groups</h1>
          <p className="text-sm text-slate-500 mt-1">
            Company-wise applicant clusters and recipient resolution for placement communications.
          </p>
        </div>
        <Link
          to="/virtual-groups/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Virtual Group
        </Link>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Virtual Groups"
          value={totalCount}
          icon={FolderTree}
        />
        <StatCard
          title="Active Recruitment Groups"
          value={stats?.activeGroups ?? 0}
          icon={CheckCircle2}
        />
        <StatCard
          title="Consented Candidates"
          value={stats?.whatsappConsentCount ?? 0}
          icon={MessageSquare}
        />
        <StatCard
          title="Removed / Archived History"
          value={stats?.removedCount ?? 0}
          icon={Archive}
        />
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by group name or company..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/50">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-transparent border-none text-slate-700 font-medium focus:ring-0 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Archived">Archived Only</option>
                <option value="Completed">Completed Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                fetchGroups();
                fetchStats();
              }}
              title="Refresh"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Groups Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : loading && groups.length === 0 ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="md" label="Loading virtual groups..." />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No virtual groups found"
            description="Create your first company virtual group to cluster candidates and inspect recipient WhatsApp resolution."
            actionText="Create Virtual Group"
            onAction={() => (window.location.href = '/virtual-groups/create')}
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[720px] text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Group Identifier</th>
                  <th className="py-3.5 px-4">Group Name</th>
                  <th className="py-3.5 px-4">Associated Company & Role</th>
                  <th className="py-3.5 px-4">Members</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((group) => {
                  const company = group.companyId;
                  return (
                    <tr
                      key={group._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                          {group.groupId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          to={`/virtual-groups/${group._id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block"
                        >
                          {group.groupName}
                        </Link>
                        {group.description && (
                          <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div>
                              <p className="font-medium text-slate-800 text-xs">{company.companyName}</p>
                              <p className="text-[11px] text-slate-400">{company.jobRole}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No company linked</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{group.memberCount} members</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(group.status)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/virtual-groups/${group._id}`}
                            title="View Group Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => setAddMembersGroup(group)}
                            title="Add Candidates"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setRecipientResolutionGroupId(group._id)}
                            title="WhatsApp Recipient Resolution"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditGroup(group)}
                            title="Edit Group"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setGroupToDelete(group)}
                            title="Delete / Archive Group"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(page * limit, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{totalCount}</span> groups
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {page} of {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recipient Resolution Audit Modal */}
      <RecipientResolutionModal
        isOpen={Boolean(recipientResolutionGroupId)}
        groupId={recipientResolutionGroupId}
        onClose={() => setRecipientResolutionGroupId(null)}
      />

      {/* Add Members Modal */}
      {addMembersGroup && (
        <AddMembersModal
          isOpen={Boolean(addMembersGroup)}
          groupId={addMembersGroup._id}
          groupName={addMembersGroup.groupName}
          onClose={() => setAddMembersGroup(null)}
          onSuccess={() => {
            fetchGroups();
            fetchStats();
          }}
        />
      )}

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={Boolean(editGroup)}
        group={editGroup}
        onClose={() => setEditGroup(null)}
        onSuccess={() => {
          fetchGroups();
          fetchStats();
        }}
      />

      {/* Delete / Archive Group Modal */}
      <DeleteGroupModal
        isOpen={Boolean(groupToDelete)}
        group={groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};
