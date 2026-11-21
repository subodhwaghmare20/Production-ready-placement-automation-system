import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send,
  Building2,
  FolderTree,
  Users,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { getCompanies } from '../services/companyService';
import { getGroups } from '../services/groupService';
import { campaignService } from '../services/campaignService';
import { cloudApiService } from '../services/cloudApiService';
import { Company, VirtualGroup, MetaTemplate } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SendMessagePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGroupId = searchParams.get('groupId') || '';

  // Data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<VirtualGroup[]>([]);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);

  // Selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(preselectedGroupId);
  const [selectedGroupMemberCount, setSelectedGroupMemberCount] = useState<number>(0);

  // Message compose state
  const [messageType, setMessageType] = useState<'TEXT' | 'TEMPLATE'>('TEXT');
  const [messageText, setMessageText] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  // Loading & statuses
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [companiesRes, groupsRes, templatesRes] = await Promise.all([
          getCompanies({ limit: 200 }),
          getGroups({ limit: 500 }),
          cloudApiService.getMetaTemplates().catch(() => []),
        ]);

        setCompanies(companiesRes.companies || []);
        setGroups(groupsRes.groups || []);
        setTemplates(templatesRes || []);

        if (preselectedGroupId && groupsRes.groups) {
          const found = groupsRes.groups.find((g) => g._id === preselectedGroupId);
          if (found) {
            const cId = typeof found.companyId === 'object' ? found.companyId._id : found.companyId;
            setSelectedCompanyId(cId);
            setSelectedGroupId(found._id);
            setSelectedGroupMemberCount(found.memberCount || 0);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to initialize send message form');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [preselectedGroupId]);

  // When selected company changes, filter available groups
  const filteredGroups = selectedCompanyId
    ? groups.filter((g) => {
        const cId = typeof g.companyId === 'object' ? g.companyId._id : g.companyId;
        return cId === selectedCompanyId;
      })
    : groups;

  // When selected group changes, update count
  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroupMemberCount(0);
      return;
    }
    const grp = groups.find((g) => g._id === selectedGroupId);
    if (grp) {
      setSelectedGroupMemberCount(grp.memberCount || 0);
      // Also sync company dropdown if not selected
      const cId = typeof grp.companyId === 'object' ? grp.companyId._id : grp.companyId;
      if (cId && !selectedCompanyId) {
        setSelectedCompanyId(cId);
      }
    }
  }, [selectedGroupId, groups, selectedCompanyId]);

  // Handle template selection
  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId || t.name === selectedTemplateId);

  const handleTemplateChange = (templateNameOrId: string) => {
    setSelectedTemplateId(templateNameOrId);
    const tmpl = templates.find((t) => t._id === templateNameOrId || t.name === templateNameOrId);
    if (tmpl) {
      // Find parameter placeholders like {{1}}, {{2}}
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

  // Build final message text
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

  const handleProceedToSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      setError('Please select a company');
      return;
    }
    if (!selectedGroupId) {
      setError('Please select a target group');
      return;
    }
    if (selectedGroupMemberCount === 0) {
      setError('The selected group has no student mobile numbers. Please add numbers first.');
      return;
    }
    if (messageType === 'TEXT' && !messageText.trim()) {
      setError('Please write a message to send');
      return;
    }
    if (messageType === 'TEMPLATE' && !selectedTemplateId) {
      setError('Please select an approved Meta template');
      return;
    }

    setError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    try {
      setSending(true);
      setError(null);

      const targetGroup = groups.find((g) => g._id === selectedGroupId);
      const targetCompany = companies.find((c) => c._id === selectedCompanyId);
      const companyName = targetCompany?.companyName || 'Company';
      const groupName = targetGroup?.groupName || 'Group';

      // 1. Create campaign in backend
      const campaignName = `${companyName} - ${groupName} - ${new Date().toLocaleDateString()}`;
      const payload: any = {
        name: campaignName,
        companyId: selectedCompanyId,
        groupId: selectedGroupId,
        provider: 'CLOUD_API',
        messageType: messageType,
        messageContent: getRenderedMessage(),
      };

      if (messageType === 'TEMPLATE' && selectedTemplate) {
        payload.metaTemplateId = selectedTemplate._id;
        payload.metaTemplateName = selectedTemplate.name;
        payload.metadata = {
          variableValues: templateParams,
        };
      }

      const res = await campaignService.createCampaign(payload);
      const campaignId = res.campaign._id;

      // 2. Immediately start campaign delivery via Cloud API
      await cloudApiService.startCampaign(campaignId);

      // 3. Navigate directly to live campaign tracking screen
      setShowConfirmModal(false);
      navigate(`/campaigns/${campaignId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to dispatch message');
      setShowConfirmModal(false);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const selectedGroupName =
    groups.find((g) => g._id === selectedGroupId)?.groupName || '';
  const selectedCompanyName =
    companies.find((c) => c._id === selectedCompanyId)?.companyName || '';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Send className="h-6 w-6 text-emerald-600" />
          Send Message
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Compose and automatically dispatch bulk WhatsApp messages to any company group via the official WhatsApp Business Cloud API
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleProceedToSend} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Message Input (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 1: Select Target Group */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              Select Target Audience
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company *
                </label>
                <div className="relative">
                  <Building2 className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      setSelectedGroupId('');
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  >
                    <option value="" disabled>
                      Select Company
                    </option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Group *
                </label>
                <div className="relative">
                  <FolderTree className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  >
                    <option value="" disabled>
                      {selectedCompanyId ? 'Select Group' : 'Choose Company First'}
                    </option>
                    {filteredGroups.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.groupName} ({g.memberCount || 0} students)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Recipient Count Indicator */}
            {selectedGroupId && (
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-xs font-medium ${
                  selectedGroupMemberCount > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>
                    Target Group:{' '}
                    <strong className="font-semibold">{selectedGroupName}</strong>
                  </span>
                </div>
                <span className="font-bold">
                  {selectedGroupMemberCount} student numbers ready
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Message Type & Compose */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              Compose WhatsApp Message
            </h2>

            {/* Mode Selector */}
            <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 gap-1">
              <button
                type="button"
                onClick={() => setMessageType('TEXT')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
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
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    messageType === 'TEMPLATE'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Meta Approved Template ({templates.length})
                </button>
              )}
            </div>

            {/* Content for TEXT */}
            {messageType === 'TEXT' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Message Text *
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    {messageText.length} characters
                  </span>
                </div>
                <textarea
                  rows={7}
                  placeholder={`Dear Student,\n\nWe are pleased to inform you that the interview round for ${
                    selectedCompanyName || 'TCS'
                  } is scheduled for tomorrow at 10:00 AM.\n\nPlease carry your updated resume and college ID.\n\nBest regards,\nTraining & Placement Cell`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
                <p className="text-xs text-slate-500">
                  Tip: Supports emojis, line breaks, and standard text formatting.
                </p>
              </div>
            )}

            {/* Content for TEMPLATE */}
            {messageType === 'TEMPLATE' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Meta Approved Template *
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  >
                    <option value="" disabled>
                      Select an approved template
                    </option>
                    {templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.category} - {t.language})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Parameter Inputs */}
                {Object.keys(templateParams).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700">
                      Template Variables:
                    </div>
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
                          className="flex-1 text-xs border border-slate-300 rounded-md p-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 3: Big Send Button */}
          <button
            type="submit"
            disabled={!selectedGroupId || selectedGroupMemberCount === 0}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
            SEND TO ALL ({selectedGroupMemberCount} STUDENTS)
          </button>
        </div>

        {/* Right Column: Live WhatsApp Message Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="bg-[#EFEAE2] rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
              {/* WhatsApp Mock Header */}
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-200 text-[#075E54] flex items-center justify-center font-bold text-sm">
                    {selectedCompanyName ? selectedCompanyName.charAt(0) : 'W'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm leading-tight">
                      {selectedCompanyName || 'Placement Notification'}
                    </div>
                    <div className="text-[11px] text-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-300" /> Verified Business
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div className="p-4 min-h-[320px] flex flex-col justify-end bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="max-w-[85%] self-start bg-white rounded-lg rounded-tl-none p-3 shadow-sm border border-slate-200/60 space-y-2">
                  <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                    {getRenderedMessage() || (
                      <span className="text-slate-400 italic">
                        Your message will appear here as you type...
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 text-right flex items-center justify-end gap-1">
                    <span>Just now</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Footer info bar */}
              <div className="bg-slate-100/90 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Official WhatsApp Cloud API</span>
                <span className="font-semibold text-emerald-700">100% Automated</span>
              </div>
            </div>

            {/* Information Callout */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <ShieldCheck className="h-4 w-4" />
                Automatic Individual Delivery
              </div>
              <p className="text-blue-700 leading-relaxed">
                When you click "Send To All", each student receives this message individually from your official verified WhatsApp business number without any manual link clicking.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Send className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              Confirm Bulk WhatsApp Dispatch
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Company:</span>
                <span className="font-bold text-slate-800">{selectedCompanyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Group:</span>
                <span className="font-bold text-slate-800">{selectedGroupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Recipients:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {selectedGroupMemberCount} students
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Method:</span>
                <span className="font-bold text-slate-800">WhatsApp Business Cloud API</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              This message will be dispatched individually to all {selectedGroupMemberCount} student mobile numbers in the group. You can monitor live delivery statuses on the next screen.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={sending}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl flex-1"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sending}
                className="px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
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
    </div>
  );
};
