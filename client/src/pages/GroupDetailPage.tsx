import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Phone,
  User,
  Plus,
  Trash2,
  Send,
  Building2,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  getGroupById,
  getGroupMembers,
  addSingleStudent,
  previewBulkMembers,
  addBulkMembers,
  removeGroupMember,
} from '../services/groupService';
import { VirtualGroup, GroupMembership } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [group, setGroup] = useState<VirtualGroup | null>(null);
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Tab for Adding Students: 'single' | 'bulk'
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single Add Form
  const [singlePhone, setSinglePhone] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);
  const [singleSuccess, setSingleSuccess] = useState<string | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);

  // Bulk Paste Form
  const [bulkText, setBulkText] = useState('');
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{
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
  } | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Delete Member state
  const [memberToRemove, setMemberToRemove] = useState<GroupMembership | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const groupData = await getGroupById(id);
      setGroup(groupData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchMembers = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingMembers(true);
      const res = await getGroupMembers(id, { limit: 500, search: searchTerm.trim() || undefined });
      setMembers(res.memberships || []);
    } catch {
      // non-fatal
    } finally {
      setLoadingMembers(false);
    }
  }, [id, searchTerm]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle Single Add
  const handleSingleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !singlePhone.trim()) return;

    try {
      setSingleSubmitting(true);
      setSingleError(null);
      setSingleSuccess(null);

      await addSingleStudent(id, {
        phoneNumber: singlePhone.trim(),
        studentName: singleName.trim() || undefined,
      });

      setSingleSuccess(`Student added successfully (${singlePhone.trim()})`);
      setSinglePhone('');
      setSingleName('');
      fetchMembers();
      fetchGroupDetails();
    } catch (err: any) {
      setSingleError(err.response?.data?.message || 'Failed to add student number');
    } finally {
      setSingleSubmitting(false);
    }
  };

  // Handle Bulk Preview
  const handleBulkPreview = async () => {
    if (!id || !bulkText.trim()) return;

    try {
      setBulkPreviewLoading(true);
      setBulkError(null);
      setBulkSuccess(null);

      const preview = await previewBulkMembers(id, bulkText);
      setBulkPreview(preview);
    } catch (err: any) {
      setBulkError(err.response?.data?.message || 'Failed to parse mobile numbers');
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  // Handle Bulk Commit
  const handleBulkAddConfirm = async () => {
    if (!id || !bulkText.trim()) return;

    try {
      setBulkSubmitting(true);
      setBulkError(null);

      const res = await addBulkMembers(id, { rawText: bulkText });
      setBulkSuccess(`Successfully added ${res.newlyAdded} new student numbers to this group!`);
      setBulkText('');
      setBulkPreview(null);
      fetchMembers();
      fetchGroupDetails();
    } catch (err: any) {
      setBulkError(err.response?.data?.message || 'Failed to import student numbers');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Handle Member Removal
  const handleRemoveMember = async () => {
    if (!id || !memberToRemove) return;

    try {
      setIsRemoving(true);
      // Member ID or candidateId
      const targetId = memberToRemove._id || (memberToRemove.candidateId as any)?._id;
      await removeGroupMember(id, targetId);
      setMemberToRemove(null);
      fetchMembers();
      fetchGroupDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-4">
        <Link
          to="/groups"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-semibold">{error || 'Group not found'}</p>
        </div>
      </div>
    );
  }

  const companyName =
    typeof group.companyId === 'object' && group.companyId
      ? group.companyId.companyName
      : 'Company';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/groups"
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 gap-1 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Groups List
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{group.groupName}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-500" />
              {companyName}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Total registered student mobile numbers:{' '}
            <span className="font-semibold text-emerald-600">{members.length}</span>
          </p>
        </div>

        {/* Action: Compose Message */}
        <Link
          to={`/send-message?groupId=${group._id}`}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs gap-2 shrink-0"
        >
          <Send className="h-4 w-4" />
          Send Message to this Group
        </Link>
      </div>

      {/* Add Students Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="h-4 w-4" />
            Add Single Mobile Number
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Bulk Paste Mobile Numbers
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: Single Number */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleAdd} className="space-y-4 max-w-xl">
              <div className="text-xs text-slate-500">
                Enter the student's 10-digit mobile number. Country code +91 will be applied automatically if omitted.
              </div>

              {singleSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{singleSuccess}</span>
                </div>
              )}
              {singleError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{singleError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={singlePhone}
                      onChange={(e) => setSinglePhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={singleSubmitting || !singlePhone.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {singleSubmitting ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          )}

          {/* TAB 2: Bulk Paste */}
          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 leading-relaxed">
                Paste student numbers directly from Excel, CSV, Notepad, or WhatsApp. You can paste lines with just mobile numbers or name + number format (e.g. <span className="font-mono text-slate-700 font-semibold">9876543210</span> or <span className="font-mono text-slate-700 font-semibold">Rahul Sharma, +91 98765 43210</span>).
              </div>

              {bulkSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{bulkSuccess}</span>
                </div>
              )}
              {bulkError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{bulkError}</span>
                </div>
              )}

              <div>
                <textarea
                  rows={5}
                  value={bulkText}
                  onChange={(e) => {
                    setBulkText(e.target.value);
                    setBulkPreview(null);
                  }}
                  placeholder={`9876543210\n9876543211\nAditya Verma, 9876543212\n+91 98765 43213`}
                  className="w-full text-sm font-mono p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkPreview}
                  disabled={bulkPreviewLoading || !bulkText.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  {bulkPreviewLoading ? 'Analyzing Numbers...' : 'Analyze & Preview Numbers'}
                </button>

                {bulkPreview && bulkPreview.validCount > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkAddConfirm}
                    disabled={bulkSubmitting}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {bulkSubmitting
                      ? 'Adding...'
                      : `Add All Valid Numbers (${bulkPreview.validCount})`}
                  </button>
                )}
              </div>

              {/* Bulk Preview Summary Breakdown */}
              {bulkPreview && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Analysis Results ({bulkPreview.totalDetected} detected):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-100/70 border border-emerald-200 text-emerald-900">
                      <div className="font-bold text-base text-emerald-700">
                        {bulkPreview.validCount}
                      </div>
                      <div>Valid & Ready to Add</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900">
                      <div className="font-bold text-base text-amber-700">
                        {bulkPreview.duplicateInPasteCount}
                      </div>
                      <div>Duplicates in Paste</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-100/70 border border-blue-200 text-blue-900">
                      <div className="font-bold text-base text-blue-700">
                        {bulkPreview.alreadyInGroupCount}
                      </div>
                      <div>Already in Group</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-100/70 border border-red-200 text-red-900">
                      <div className="font-bold text-base text-red-700">
                        {bulkPreview.invalidCount}
                      </div>
                      <div>Invalid Format</div>
                    </div>
                  </div>

                  {bulkPreview.items.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 text-xs">
                      {bulkPreview.items.map((item, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between">
                          <span className="font-mono text-slate-700">
                            {item.normalized || item.raw}{' '}
                            {item.name ? `(${item.name})` : ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              item.status === 'VALID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'ALREADY_IN_GROUP'
                                ? 'bg-blue-100 text-blue-800'
                                : item.status === 'DUPLICATE_IN_PASTE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Members List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Student Numbers in Group ({members.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {loadingMembers ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-2">
              <Phone className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No student numbers added yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Use the form above to add a single student mobile number or bulk paste your contact list.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Added On</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {members.map((m, idx) => {
                  const phone =
                    m.normalizedPhoneNumber ||
                    m.phoneNumber ||
                    m.candidateId?.phoneNumber ||
                    '—';
                  const name =
                    m.studentName ||
                    m.candidateId?.fullName ||
                    '—';

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {phone}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(m.createdAt || m.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setMemberToRemove(m)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove student number from group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Remove Number from Group
            </h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-slate-800">
                {memberToRemove.normalizedPhoneNumber || memberToRemove.phoneNumber || 'this number'}
              </span>{' '}
              from {group.groupName}?
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs flex-1 disabled:opacity-50"
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
