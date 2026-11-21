import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Phone,
  User,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  ShieldCheck,
  Check,
  CheckCheck,
  Eye,
  Clock,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';
import {
  getGroupById,
  getGroupMembers,
  addSingleStudent,
  previewBulkMembers,
  addBulkMembers,
  removeGroupMember,
} from '../services/groupService';
import { campaignService } from '../services/campaignService';
import { cloudApiService } from '../services/cloudApiService';
import { VirtualGroup, GroupMembership, MetaTemplate, WhatsAppCampaign, CampaignRecipient } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [group, setGroup] = useState<VirtualGroup | null>(null);
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Primary active view: 'students' | 'send'
  const [mainTab, setMainTab] = useState<'students' | 'send'>('students');

  // Sub-tab for adding students: 'single' | 'bulk'
  const [addMethod, setAddMethod] = useState<'single' | 'bulk'>('single');

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

  // Send Message State
  const [messageType, setMessageType] = useState<'TEXT' | 'TEMPLATE'>('TEXT');
  const [messageText, setMessageText] = useState('');
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendMessageError, setSendMessageError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Active or recent campaign state for live tracking directly on this page
  const [activeCampaign, setActiveCampaign] = useState<WhatsAppCampaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipient[]>([]);
  const [campaignActionLoading, setCampaignActionLoading] = useState(false);
  const pollIntervalRef = useRef<any>(null);

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

  // Load Meta Templates
  useEffect(() => {
    cloudApiService.getMetaTemplates().then(setTemplates).catch(() => []);
  }, []);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Check if there is an active/recent campaign for this group
  const checkRecentCampaign = useCallback(async () => {
    if (!id) return;
    try {
      const res = await campaignService.getCampaigns({ limit: 10 });
      const groupCamp = res.campaigns.find((c) => {
        const gId = typeof c.groupId === 'object' ? c.groupId._id : c.groupId;
        return gId === id;
      });
      if (groupCamp) {
        setActiveCampaign(groupCamp);
        const recRes = await campaignService.getCampaignRecipients(groupCamp._id, { limit: 200 });
        setCampaignRecipients(recRes.recipients || []);
      }
    } catch {
      // non-fatal
    }
  }, [id]);

  useEffect(() => {
    checkRecentCampaign();
  }, [checkRecentCampaign]);

  // Auto-poll campaign while running
  useEffect(() => {
    if (!activeCampaign) return;
    const activeStatuses = ['PROCESSING', 'RUNNING', 'PENDING', 'QUEUED', 'SENDING', 'IN_PROGRESS'];
    const isActive = activeStatuses.includes(activeCampaign.status?.toUpperCase() || '');

    if (isActive) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const fresh = await campaignService.getCampaignById(activeCampaign._id);
          setActiveCampaign(fresh);
          const recRes = await campaignService.getCampaignRecipients(activeCampaign._id, { limit: 200 });
          setCampaignRecipients(recRes.recipients || []);
        } catch {
          // ignore
        }
      }, 3000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeCampaign?.status]);

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
      setBulkSuccess(`Successfully added ${res.newlyAdded} new student numbers!`);
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

  // Template handling
  const selectedTemplate = templates.find(
    (t) => t._id === selectedTemplateId || t.name === selectedTemplateId
  );

  const handleTemplateChange = (templateNameOrId: string) => {
    setSelectedTemplateId(templateNameOrId);
    const tmpl = templates.find((t) => t._id === templateNameOrId || t.name === templateNameOrId);
    if (tmpl) {
      const bodyComponent = tmpl.components.find((c) => c.type === 'BODY');
      const bodyText = bodyComponent?.text || '';
      const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
      const initialMap: Record<string, string> = {};
      matches.forEach((m) => {
        const varNum = m.replace(/[{}]/g, '');
        initialMap[varNum] = '';
      });
      setTemplateParams(initialMap);
    }
  };

  const getRenderedMessage = () => {
    if (messageType === 'TEXT') {
      return messageText;
    }
    if (selectedTemplate) {
      const bodyComponent = selectedTemplate.components.find((c) => c.type === 'BODY');
      let text = bodyComponent?.text || '';
      Object.entries(templateParams).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || `[Param ${k}]`);
      });
      return text;
    }
    return '';
  };

  // Handle Send to All
  const handleProceedToSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (members.length === 0) {
      setSendMessageError('Please add student mobile numbers first.');
      return;
    }
    if (messageType === 'TEXT' && !messageText.trim()) {
      setSendMessageError('Please enter a message text to send.');
      return;
    }
    if (messageType === 'TEMPLATE' && !selectedTemplateId) {
      setSendMessageError('Please select a Meta approved template.');
      return;
    }

    setSendMessageError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!id || !group) return;
    try {
      setSendingMessage(true);
      setSendMessageError(null);

      const campaignName = `${group.groupName} - ${new Date().toLocaleDateString()}`;
      const payload: any = {
        name: campaignName,
        groupId: id,
        provider: 'CLOUD_API',
        messageType: messageType,
        messageContent: getRenderedMessage(),
      };

      if (messageType === 'TEMPLATE' && selectedTemplate) {
        payload.metaTemplateId = selectedTemplate._id;
        payload.metaTemplateName = selectedTemplate.name;
        payload.metadata = { variableValues: templateParams };
      }

      // 1. Create campaign
      const res = await campaignService.createCampaign(payload);
      const campId = res.campaign._id;

      // 2. Start dispatch
      await cloudApiService.startCampaign(campId);

      // 3. Load active campaign for tracking right inside this page
      const createdCampaign = await campaignService.getCampaignById(campId);
      setActiveCampaign(createdCampaign);
      const recRes = await campaignService.getCampaignRecipients(campId, { limit: 200 });
      setCampaignRecipients(recRes.recipients || []);

      setShowConfirmModal(false);
      setMessageText('');
    } catch (err: any) {
      setSendMessageError(err.response?.data?.message || err.message || 'Failed to dispatch messages');
      setShowConfirmModal(false);
    } finally {
      setSendingMessage(false);
    }
  };

  // Campaign controls
  const handlePauseCampaign = async () => {
    if (!activeCampaign) return;
    try {
      setCampaignActionLoading(true);
      await cloudApiService.pauseCampaign(activeCampaign._id);
      const fresh = await campaignService.getCampaignById(activeCampaign._id);
      setActiveCampaign(fresh);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to pause');
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const handleResumeCampaign = async () => {
    if (!activeCampaign) return;
    try {
      setCampaignActionLoading(true);
      await cloudApiService.resumeCampaign(activeCampaign._id);
      const fresh = await campaignService.getCampaignById(activeCampaign._id);
      setActiveCampaign(fresh);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume');
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!activeCampaign) return;
    if (!confirm('Cancel remaining unsent messages?')) return;
    try {
      setCampaignActionLoading(true);
      await cloudApiService.cancelCampaign(activeCampaign._id);
      const fresh = await campaignService.getCampaignById(activeCampaign._id);
      setActiveCampaign(fresh);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCampaignActionLoading(false);
    }
  };

  const getRecipientStatus = (r: CampaignRecipient): 'READ' | 'DELIVERED' | 'SENT' | 'FAILED' | 'PENDING' => {
    const s = ((r as any).providerStatus || r.deliveryStatus || '').toUpperCase();
    if (s === 'READ') return 'READ';
    if (s === 'DELIVERED') return 'DELIVERED';
    if (s === 'SENT' || r.status === 'SENT_MANUALLY_CONFIRMED') return 'SENT';
    if (s === 'FAILED' || r.status === 'FAILED_TO_OPEN') return 'FAILED';
    return 'PENDING';
  };

  if (loading) {
    return (
      <div className="p-16 flex justify-center">
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

  // Campaign stats calculation
  const campTotal = activeCampaign?.totalRecipients || campaignRecipients.length || 0;
  const campSent = campaignRecipients.filter((r) =>
    ['SENT', 'DELIVERED', 'READ'].includes(getRecipientStatus(r))
  ).length;
  const campDelivered = campaignRecipients.filter((r) =>
    ['DELIVERED', 'READ'].includes(getRecipientStatus(r))
  ).length;
  const campRead = campaignRecipients.filter((r) => getRecipientStatus(r) === 'READ').length;
  const campFailed = campaignRecipients.filter((r) => getRecipientStatus(r) === 'FAILED').length;
  const campPending = Math.max(0, campTotal - (campSent + campFailed));
  const campProgress = campTotal > 0 ? Math.round(((campSent + campFailed) / campTotal) * 100) : 0;
  const campIsRunning = ['PROCESSING', 'RUNNING', 'SENDING', 'IN_PROGRESS'].includes(
    activeCampaign?.status?.toUpperCase() || ''
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/groups"
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 gap-1 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to All Groups
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {group.groupName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              {members.length} Students
            </span>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs: (1. Students & Numbers) vs (2. Compose & Send Message) */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-3 shadow-xs gap-6">
        <button
          onClick={() => setMainTab('students')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            mainTab === 'students'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          1. Student Mobile Numbers ({members.length})
        </button>
        <button
          onClick={() => setMainTab('send')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            mainTab === 'send'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Send className="h-4 w-4" />
          2. Send WhatsApp Message
          {campIsRunning && (
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ADD & MANAGE STUDENT MOBILE NUMBERS                                */}
      {/* ========================================================================= */}
      {mainTab === 'students' && (
        <div className="space-y-6">
          {/* Add Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Add Sub-tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/60 px-6 py-2.5 gap-4">
              <button
                onClick={() => setAddMethod('single')}
                className={`text-xs font-bold py-1 px-3 rounded-lg transition-colors cursor-pointer ${
                  addMethod === 'single'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                + Add Single Number
              </button>
              <button
                onClick={() => setAddMethod('bulk')}
                className={`text-xs font-bold py-1 px-3 rounded-lg transition-colors cursor-pointer ${
                  addMethod === 'bulk'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                📋 Bulk Paste Numbers
              </button>
            </div>

            <div className="p-6">
              {/* Method A: Single Student */}
              {addMethod === 'single' && (
                <form onSubmit={handleSingleAdd} className="space-y-4 max-w-xl">
                  {singleSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{singleSuccess}</span>
                    </div>
                  )}
                  {singleError && (
                    <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{singleError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Mobile Number *
                      </label>
                      <div className="relative">
                        <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={singlePhone}
                          onChange={(e) => setSinglePhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        +91 is automatically added for 10-digit Indian numbers.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Student Name (Optional)
                      </label>
                      <div className="relative">
                        <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          value={singleName}
                          onChange={(e) => setSingleName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={singleSubmitting || !singlePhone.trim()}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {singleSubmitting ? 'Adding...' : 'Add Student Number'}
                  </button>
                </form>
              )}

              {/* Method B: Bulk Paste */}
              {addMethod === 'bulk' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Paste student mobile numbers directly from Excel, CSV, or WhatsApp. You can paste lines with just mobile numbers or name + number format (e.g. <span className="font-mono text-slate-700 font-bold">9876543210</span> or <span className="font-mono text-slate-700 font-bold">Aditya, 9876543211</span>).
                  </div>

                  {bulkSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{bulkSuccess}</span>
                    </div>
                  )}
                  {bulkError && (
                    <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      <span>{bulkError}</span>
                    </div>
                  )}

                  <textarea
                    rows={5}
                    value={bulkText}
                    onChange={(e) => {
                      setBulkText(e.target.value);
                      setBulkPreview(null);
                    }}
                    placeholder={`9876543210\n9876543211\nPooja Sharma, 9876543212\n+91 98765 43213`}
                    className="w-full text-sm font-mono p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleBulkPreview}
                      disabled={bulkPreviewLoading || !bulkText.trim()}
                      className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      {bulkPreviewLoading ? 'Analyzing...' : 'Analyze & Preview Numbers'}
                    </button>

                    {bulkPreview && bulkPreview.validCount > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkAddConfirm}
                        disabled={bulkSubmitting}
                        className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        {bulkSubmitting
                          ? 'Adding...'
                          : `Add All Valid Numbers (${bulkPreview.validCount})`}
                      </button>
                    )}
                  </div>

                  {/* Bulk Preview Breakdown */}
                  {bulkPreview && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900">
                          <div className="font-extrabold text-base text-emerald-700">
                            {bulkPreview.validCount}
                          </div>
                          <div>Valid & Ready to Add</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-900">
                          <div className="font-extrabold text-base text-amber-700">
                            {bulkPreview.duplicateInPasteCount}
                          </div>
                          <div>Duplicates in Paste</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-100/70 border border-blue-200 text-blue-900">
                          <div className="font-extrabold text-base text-blue-700">
                            {bulkPreview.alreadyInGroupCount}
                          </div>
                          <div>Already in Group</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-red-100/70 border border-red-200 text-red-900">
                          <div className="font-extrabold text-base text-red-700">
                            {bulkPreview.invalidCount}
                          </div>
                          <div>Invalid Format</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Students in this Group ({members.length})
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
                  Add student mobile numbers using the form above so you can message them.
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
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
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
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove number"
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

          {/* Quick jump to Send Message Tab */}
          {members.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="text-xs text-emerald-900 font-medium">
                You have <strong>{members.length} students</strong> registered in this group. Ready to send them a WhatsApp message?
              </div>
              <button
                onClick={() => setMainTab('send')}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Proceed to Send Message →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPOSE & SEND WHATSAPP MESSAGE DIRECTLY IN THIS GROUP            */}
      {/* ========================================================================= */}
      {mainTab === 'send' && (
        <div className="space-y-6">
          {sendMessageError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{sendMessageError}</span>
            </div>
          )}

          {/* Compose Form */}
          <form onSubmit={handleProceedToSend} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left compose column */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Send className="h-5 w-5 text-emerald-600" />
                    Write WhatsApp Message
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    To {members.length} Students in {group.groupName}
                  </span>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
                  <button
                    type="button"
                    onClick={() => setMessageType('TEXT')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      messageType === 'TEXT'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom Text Message
                  </button>
                  {templates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMessageType('TEMPLATE')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        messageType === 'TEMPLATE'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Meta Approved Template ({templates.length})
                    </button>
                  )}
                </div>

                {/* Message input */}
                {messageType === 'TEXT' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Message Content *
                      </label>
                      <span className="text-xs text-slate-400 font-mono">
                        {messageText.length} characters
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      placeholder={`Dear Student,\n\nWe are pleased to inform you that your recruitment round for ${group.groupName} is scheduled for tomorrow at 10:00 AM.\n\nPlease carry your updated resume and college ID card.\n\nBest regards,\nPlacement Cell`}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full text-sm p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      required
                    />
                    <p className="text-xs text-slate-400">
                      Supports emojis, newlines, and standard text formatting.
                    </p>
                  </div>
                )}

                {messageType === 'TEMPLATE' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Approved Template *
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      required
                    >
                      <option value="" disabled>
                        Choose Meta Template
                      </option>
                      {templates.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.category} - {t.language})
                        </option>
                      ))}
                    </select>

                    {Object.keys(templateParams).length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700">Template Variables:</div>
                        {Object.keys(templateParams).map((paramKey) => (
                          <div key={paramKey} className="flex items-center gap-2">
                            <span className="w-16 text-xs font-mono text-slate-500 shrink-0">
                              {`{{${paramKey}}}`}
                            </span>
                            <input
                              type="text"
                              placeholder={`Value for {{${paramKey}}}`}
                              value={templateParams[paramKey]}
                              onChange={(e) =>
                                setTemplateParams({
                                  ...templateParams,
                                  [paramKey]: e.target.value,
                                })
                              }
                              className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Big Send Button */}
              <button
                type="submit"
                disabled={members.length === 0}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="h-5 w-5" />
                SEND TO ALL ({members.length} STUDENTS)
              </button>
            </div>

            {/* Right column: Phone Preview */}
            <div className="lg:col-span-5">
              <div className="sticky top-6 bg-[#EFEAE2] rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-200 text-[#075E54] flex items-center justify-center font-bold text-sm">
                    {group.groupName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm leading-tight">{group.groupName}</div>
                    <div className="text-[11px] text-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-300" /> Verified WhatsApp Business
                    </div>
                  </div>
                </div>

                <div className="p-4 min-h-[280px] flex flex-col justify-end bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="max-w-[85%] self-start bg-white rounded-lg rounded-tl-none p-3 shadow-sm border border-slate-200/60 space-y-2">
                    <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {getRenderedMessage() || (
                        <span className="text-slate-400 italic">
                          Your message will appear here in real time...
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 text-right flex items-center justify-end gap-1">
                      <span>Just now</span>
                      <span className="text-blue-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100/90 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Official Cloud API</span>
                  <span className="font-semibold text-emerald-700">100% Automated</span>
                </div>
              </div>
            </div>
          </form>

          {/* Active / Recent Live Dispatch Tracker embedded right here */}
          {activeCampaign && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dispatch Progress for {group.groupName}
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {activeCampaign.name}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      activeCampaign.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeCampaign.status === 'PAUSED'
                        ? 'bg-amber-100 text-amber-800'
                        : campIsRunning
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {activeCampaign.status}
                  </span>

                  {campIsRunning && (
                    <button
                      onClick={handlePauseCampaign}
                      disabled={campaignActionLoading}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                  )}

                  {activeCampaign.status === 'PAUSED' && (
                    <button
                      onClick={handleResumeCampaign}
                      disabled={campaignActionLoading}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                  )}

                  {(campIsRunning || activeCampaign.status === 'PAUSED') && (
                    <button
                      onClick={handleCancelCampaign}
                      disabled={campaignActionLoading}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono font-bold text-slate-700">
                  <span>
                    Sent {campSent + campFailed} of {campTotal}
                  </span>
                  <span>{campProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 transition-all duration-500 h-full"
                    style={{ width: `${campTotal > 0 ? (campSent / campTotal) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all duration-500 h-full"
                    style={{ width: `${campTotal > 0 ? (campFailed / campTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Counter Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <div className="text-lg font-extrabold text-blue-700 font-mono">{campSent}</div>
                  <div className="text-[11px] font-bold text-blue-900 flex items-center justify-center gap-1">
                    <Check className="h-3 w-3" /> Sent
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-lg font-extrabold text-emerald-700 font-mono">
                    {campDelivered}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-center gap-1">
                    <CheckCheck className="h-3 w-3" /> Delivered
                  </div>
                </div>

                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-center">
                  <div className="text-lg font-extrabold text-teal-700 font-mono">{campRead}</div>
                  <div className="text-[11px] font-bold text-teal-900 flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" /> Read
                  </div>
                </div>

                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-center">
                  <div className="text-lg font-extrabold text-red-700 font-mono">{campFailed}</div>
                  <div className="text-[11px] font-bold text-red-900 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Failed
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center col-span-2 sm:col-span-1">
                  <div className="text-lg font-extrabold text-slate-700 font-mono">{campPending}</div>
                  <div className="text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </div>
                </div>
              </div>

              {/* Recipient status log */}
              {campaignRecipients.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  {campaignRecipients.map((r, idx) => {
                    const status = getRecipientStatus(r);
                    return (
                      <div key={r._id || idx} className="p-2.5 flex items-center justify-between">
                        <span className="font-mono text-slate-800">
                          {r.phoneNumber} {r.candidateName ? `(${r.candidateName})` : ''}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            status === 'READ'
                              ? 'bg-teal-100 text-teal-800'
                              : status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'SENT'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Send className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 text-center">
              Send Message to {group.groupName}?
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Group:</span>
                <span className="font-bold text-slate-800">{group.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recipients:</span>
                <span className="font-extrabold text-emerald-600">{members.length} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sending Method:</span>
                <span className="font-bold text-slate-800">Official WhatsApp Cloud API</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Each student will receive this message individually from your verified WhatsApp number.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={sendingMessage}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl flex-1 cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sendingMessage}
                className="px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex-1 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {sendingMessage ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Confirm & Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Remove Number
            </h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              Remove{' '}
              <span className="font-semibold text-slate-800">
                {memberToRemove.normalizedPhoneNumber || memberToRemove.phoneNumber || 'this number'}
              </span>{' '}
              from {group.groupName}?
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl flex-1 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex-1 disabled:opacity-50 cursor-pointer"
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
