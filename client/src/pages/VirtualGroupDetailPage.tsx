import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  MessageSquare,
  Sparkles,
  Search,
  UserMinus,
  UserPlus,
  Edit,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  History,
  Info,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  getGroupById,
  getGroupMembers,
  getGroupActivities,
  removeGroupMember,
  addGroupMembers,
  getEligibleCandidates,
  getAvailableCandidates,
  deleteGroup,
} from '../services/groupService';
import {
  VirtualGroup,
  GroupMembership,
  GroupActivity,
  CandidateEligibilityItem,
  Candidate,
} from '../types';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecipientResolutionModal } from '../components/groups/RecipientResolutionModal';
import { AddMembersModal } from '../components/groups/AddMembersModal';
import { EditGroupModal } from '../components/groups/EditGroupModal';
import { DeleteGroupModal } from '../components/groups/DeleteGroupModal';

export const VirtualGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<VirtualGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'overview' | 'members' | 'add' | 'activities'
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'add' | 'activities'>('overview');

  // Members Tab State
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberTotalPages, setMemberTotalPages] = useState(1);

  // Activity History State
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Embedded Add Candidates Tab State
  const [embedTab, setEmbedTab] = useState<'suggestions' | 'search'>('suggestions');
  const [suggestions, setSuggestions] = useState<CandidateEligibilityItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [availSearch, setAvailSearch] = useState('');
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Member Removal State
  const [memberToRemove, setMemberToRemove] = useState<GroupMembership | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  // Modals State
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getGroupById(id);
      setGroup(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Virtual group not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchMembers = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingMembers(true);
      const res = await getGroupMembers(id, {
        page: memberPage,
        limit: 15,
        search: memberSearch,
      });
      setMembers(res.memberships);
      setMemberTotal(res.pagination.total);
      setMemberTotalPages(res.pagination.totalPages);
    } catch {
      // Non-fatal
    } finally {
      setLoadingMembers(false);
    }
  }, [id, memberPage, memberSearch]);

  const fetchActivities = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingActivities(true);
      const res = await getGroupActivities(id);
      setActivities(res);
    } catch {
      // Non-fatal
    } finally {
      setLoadingActivities(false);
    }
  }, [id]);

  const fetchSuggestions = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingSuggestions(true);
      const res = await getEligibleCandidates(id);
      setSuggestions(res.evaluations || []);
    } catch {
      // Non-fatal
    } finally {
      setLoadingSuggestions(false);
    }
  }, [id]);

  const fetchAvailable = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingAvailable(true);
      const res = await getAvailableCandidates(id, { search: availSearch, limit: 50 });
      setAvailableCandidates(res.candidates || []);
    } catch {
      // Non-fatal
    } finally {
      setLoadingAvailable(false);
    }
  }, [id, availSearch]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'activities') {
      fetchActivities();
    } else if (activeTab === 'add') {
      fetchSuggestions();
      fetchAvailable();
    }
  }, [activeTab, fetchMembers, fetchActivities, fetchSuggestions, fetchAvailable]);

  // Handle Member Removal
  const handleConfirmRemoval = async () => {
    if (!id || !memberToRemove) return;
    try {
      setIsRemoving(true);
      const targetId = memberToRemove.candidateId?._id || memberToRemove._id;
      await removeGroupMember(id, targetId, removalReason);
      setMemberToRemove(null);
      setRemovalReason('');
      fetchMembers();
      fetchGroup();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle Bulk Assign from embedded Add Tab
  const handleBulkAssign = async () => {
    if (!id || selectedAddIds.length === 0) return;
    try {
      setIsAssigning(true);
      await addGroupMembers(id, selectedAddIds);
      setSelectedAddIds([]);
      fetchGroup();
      fetchMembers();
      fetchSuggestions();
      fetchAvailable();
      setActiveTab('members');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign candidates');
    } finally {
      setIsAssigning(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (members.length === 0) return;
    const headers = ['Candidate ID', 'Full Name', 'Phone Number', 'Email', 'Branch', 'Degree', 'Passing Year', 'Placement Status', 'WhatsApp Consent', 'Assigned Date'];
    const rows = members.map((m) => {
      const cand = m.candidateId || ({} as any);
      return [
        `"${cand.candidateId || ''}"`,
        `"${cand.fullName || m.studentName || ''}"`,
        `"${cand.phoneNumber || m.phoneNumber || ''}"`,
        `"${cand.email || ''}"`,
        `"${cand.branch || ''}"`,
        `"${cand.degree || ''}"`,
        `"${cand.passingYear || ''}"`,
        `"${cand.placementStatus || ''}"`,
        `"${cand.whatsappConsent ? 'Consented' : 'No Consent'}"`,
        `"${new Date(m.assignedAt).toLocaleDateString()}"`,
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${group?.groupName || 'group'}_members.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading virtual group details..." />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Virtual Group Not Found</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">{error}</p>
        <Link
          to="/virtual-groups"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Virtual Groups
        </Link>
      </div>
    );
  }

  const company = group.companyId;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/virtual-groups"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Virtual Group Management
        </span>
      </div>

      {/* Main Group Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                {group.groupId}
              </span>
              <h1 className="text-2xl font-bold text-slate-900">{group.groupName}</h1>
              <Badge
                variant={
                  group.status === 'Active'
                    ? 'success'
                    : group.status === 'Archived'
                    ? 'default'
                    : 'info'
                }
              >
                {group.status}
              </Badge>
            </div>

            {company && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400" />
                <Link
                  to={`/companies/${company._id}`}
                  className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  {company.companyName}
                </Link>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{company.jobRole}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                  {company.companyId}
                </span>
              </div>
            )}

            {group.description && (
              <p className="text-sm text-slate-500 max-w-2xl">{group.description}</p>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Members
            </button>

            <button
              onClick={() => setIsResolutionOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Resolve Recipients
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Edit Group"
            >
              <Edit className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors"
              title="Delete or Archive Group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Active Members</span>
            <span className="text-xl font-bold text-slate-900">{group.memberCount}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Drive Role</span>
            <span className="text-sm font-semibold text-slate-800">{company?.jobRole || 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Created On</span>
            <span className="text-xs font-semibold text-slate-700">
              {new Date(group.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Created By</span>
            <span className="text-xs font-semibold text-slate-700">
              {group.createdBy?.name || 'Placement Admin'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Info className="w-4 h-4" />
            Drive Overview & Criteria
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Group Members ({group.memberCount})
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'add'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Candidate Suggestions & Add
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'activities'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Activity History
          </button>
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {company && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company & Drive Parameters */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Recruitment Drive Specifications
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Company Name</span>
                    <span className="font-semibold text-slate-800 text-sm">{company.companyName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Job Role</span>
                    <span className="font-semibold text-slate-800 text-sm">{company.jobRole}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Required Vacancies</span>
                    <span className="font-semibold text-slate-800">{company.requiredCandidates} candidates</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Work Mode</span>
                    <span className="font-semibold text-slate-800">{company.workMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Salary Package</span>
                    <span className="font-semibold text-slate-800">{company.salaryPackage || 'Undisclosed'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Job Location</span>
                    <span className="font-semibold text-slate-800">{company.jobLocation || 'Pan-India'}</span>
                  </div>
                </div>

                {company.hrName && (
                  <div className="pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 block font-medium mb-1">HR Contact Details</span>
                    <p className="font-semibold text-slate-800">
                      {company.hrName} {company.hrEmail ? `• ${company.hrEmail}` : ''}{' '}
                      {company.hrPhone ? `• ${company.hrPhone}` : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Eligibility Criteria Matrix */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Eligibility Criteria Matrix
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Eligible Degrees</span>
                    <span className="font-semibold text-slate-800">
                      {company.eligibleDegrees?.length ? company.eligibleDegrees.join(', ') : 'Any Degree'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Eligible Branches</span>
                    <span className="font-semibold text-slate-800">
                      {company.eligibleBranches?.length ? company.eligibleBranches.join(', ') : 'Any Branch'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Eligible Passing Years</span>
                    <span className="font-semibold text-slate-800">
                      {company.eligiblePassingYears?.length
                        ? company.eligiblePassingYears.join(', ')
                        : 'Any Passing Year'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Experience Requirement</span>
                    <span className="font-semibold text-slate-800">
                      {company.experienceType || 'Fresher'}
                      {company.minimumExperience !== undefined
                        ? ` (Min: ${company.minimumExperience} yrs)`
                        : ''}
                    </span>
                  </div>

                  {company.requiredSkills && company.requiredSkills.length > 0 && (
                    <div>
                      <span className="text-slate-400 block font-medium mb-1">Required Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {company.requiredSkills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recipient Resolution Audit Card */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 p-6 rounded-xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                WhatsApp Recipient Resolution Audit
              </h4>
              <p className="text-xs text-slate-600">
                Verify messaging consent, E.164 phone normalization, and broadcast readiness before sending WhatsApp notices.
              </p>
            </div>
            <button
              onClick={() => setIsResolutionOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Launch Recipient Audit
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberPage(1);
                }}
                placeholder="Search active group members by name, candidate ID, phone, or branch..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={members.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Members
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingMembers && members.length === 0 ? (
              <div className="p-12 text-center">
                <LoadingSpinner size="md" label="Loading group members..." />
              </div>
            ) : members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No active members in group"
                description="Assign eligible candidates to this virtual recruitment group to start tracking drive progress."
                actionText="Add Candidates Now"
                onAction={() => setIsAddModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                  <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Candidate ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Phone / WhatsApp</th>
                      <th className="py-3 px-4">Branch & Degree</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Assigned On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m) => {
                      const cand: any = m.candidateId || {
                        _id: m._id,
                        candidateId: 'N/A',
                        fullName: m.studentName || 'Student',
                        phoneNumber: m.phoneNumber || m.normalizedPhoneNumber || 'N/A',
                        whatsappConsent: true,
                      };
                      return (
                        <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {cand.candidateId}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <Link
                              to={`/candidates/${cand._id}`}
                              className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                            >
                              {cand.fullName}
                            </Link>
                            <span className="block text-[11px] text-slate-400">
                              {cand.collegeName || 'N/A'}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-xs font-mono text-slate-800">{cand.phoneNumber}</div>
                            {cand.whatsappConsent ? (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                                WhatsApp Consented
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                                Pending Consent
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs">
                            <span className="font-medium text-slate-800 block">{cand.branch || 'N/A'}</span>
                            <span className="text-slate-400 text-[11px]">{cand.degree || 'N/A'}</span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                            {cand.passingYear || 'N/A'}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                            {new Date(m.assignedAt).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => setMemberToRemove(m)}
                              title="Remove Candidate from Group"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Member Pagination */}
            {memberTotal > 0 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(memberPage - 1) * 15 + 1} to {Math.min(memberPage * 15, memberTotal)} of{' '}
                  {memberTotal} members
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={memberPage <= 1}
                    onClick={() => setMemberPage((p) => p - 1)}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1 font-medium">{memberPage} / {memberTotalPages || 1}</span>
                  <button
                    disabled={memberPage >= memberTotalPages}
                    onClick={() => setMemberPage((p) => p + 1)}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADD CANDIDATES */}
      {activeTab === 'add' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Candidates to Group</h3>
              <p className="text-xs text-slate-500">
                Match applicants using company requirements or select from registered candidates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedAddIds.length} Selected
              </span>
              <button
                onClick={handleBulkAssign}
                disabled={selectedAddIds.length === 0 || isAssigning}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors"
              >
                {isAssigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Assign Selected
              </button>
            </div>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => setEmbedTab('suggestions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                embedTab === 'suggestions'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Automated Suggestions ({suggestions.length})
            </button>
            <button
              onClick={() => setEmbedTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                embedTab === 'search'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Browse Unassigned Candidates ({availableCandidates.length})
            </button>
          </div>

          {/* Tab Content */}
          {embedTab === 'suggestions' ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {loadingSuggestions ? (
                <div className="p-8 text-center">
                  <LoadingSpinner size="sm" label="Evaluating eligible candidates..." />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No unassigned candidates match the eligibility criteria for this company.
                </div>
              ) : (
                suggestions.map((item) => {
                  const cand = item.candidate;
                  const isChecked = selectedAddIds.includes(cand._id);
                  return (
                    <div
                      key={cand._id}
                      onClick={() =>
                        setSelectedAddIds((prev) =>
                          isChecked ? prev.filter((i) => i !== cand._id) : [...prev, cand._id]
                        )
                      }
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-indigo-50/70 border-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">{cand.fullName}</span>
                            <span className="text-xs font-mono text-slate-400">{cand.candidateId}</span>
                            <Badge variant={cand.placementStatus === 'Available' ? 'success' : 'default'}>
                              {cand.placementStatus}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cand.degree} • {cand.branch} • Batch {cand.passingYear}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.matchScore >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {item.matchScore}% Match
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={availSearch}
                  onChange={(e) => setAvailSearch(e.target.value)}
                  placeholder="Filter available candidates..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {loadingAvailable ? (
                  <div className="p-8 text-center">
                    <LoadingSpinner size="sm" label="Searching available candidates..." />
                  </div>
                ) : availableCandidates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No available unassigned candidates found.
                  </div>
                ) : (
                  availableCandidates.map((cand) => {
                  const isChecked = selectedAddIds.includes(cand._id);
                  return (
                    <div
                      key={cand._id}
                      onClick={() =>
                        setSelectedAddIds((prev) =>
                          isChecked ? prev.filter((i) => i !== cand._id) : [...prev, cand._id]
                        )
                      }
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-indigo-50/70 border-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">{cand.fullName}</span>
                            <span className="text-xs font-mono text-slate-400">{cand.candidateId}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cand.degree} • {cand.branch} • Batch {cand.passingYear}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500 font-mono">
                        {cand.phoneNumber}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ACTIVITY HISTORY */}
      {activeTab === 'activities' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Virtual Group Audit Timeline</h3>
              <p className="text-xs text-slate-500">
                Track all administrative actions, member assignments, removals, and status adjustments.
              </p>
            </div>
            <button
              onClick={fetchActivities}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingActivities ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingActivities && activities.length === 0 ? (
            <div className="p-8 text-center">
              <LoadingSpinner size="sm" label="Loading audit history..." />
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No audit activities recorded for this virtual group yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activities.map((act) => (
                <div key={act._id} className="relative group">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {act.action.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{act.details}</p>
                    {act.performedBy && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        By: {act.performedBy.name} ({act.performedBy.email})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Removing Member */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Remove Candidate from Group</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-slate-900">
                {memberToRemove.candidateId?.fullName || memberToRemove.studentName || 'Member'} ({memberToRemove.candidateId?.candidateId || memberToRemove.normalizedPhoneNumber || 'ID'})
              </span>{' '}
              from this recruitment group? This will mark the membership as <em>Removed</em> while preserving
              historical audit tracking.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Reason for Removal (Optional)
              </label>
              <input
                type="text"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="e.g. Ineligible in round 1, candidate opted out, etc."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoving}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoval}
                disabled={isRemoving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                {isRemoving ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Resolution Audit Modal */}
      <RecipientResolutionModal
        isOpen={isResolutionOpen}
        groupId={group._id}
        onClose={() => setIsResolutionOpen(false)}
      />

      {/* Add Members Modal */}
      <AddMembersModal
        isOpen={isAddModalOpen}
        groupId={group._id}
        groupName={group.groupName}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchGroup();
          fetchMembers();
          fetchActivities();
        }}
      />

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={isEditModalOpen}
        group={group}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setGroup(updated);
          fetchActivities();
        }}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        group={group}
        isDeleting={isDeletingGroup}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          try {
            setIsDeletingGroup(true);
            await deleteGroup(group._id);
            navigate('/virtual-groups', { replace: true });
          } finally {
            setIsDeletingGroup(false);
          }
        }}
      />
    </div>
  );
};
