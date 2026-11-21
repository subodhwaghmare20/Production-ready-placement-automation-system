import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sparkles,
  Info,
  Cloud,
  MessageCircle,
} from 'lucide-react';
import { getCompanies } from '../services/companyService';
import { getGroups } from '../services/groupService';
import { templateService } from '../services/templateService';
import { campaignService, PreviewAudienceResponse } from '../services/campaignService';
import { cloudApiService } from '../services/cloudApiService';
import { Company, VirtualGroup, MessageTemplate, MetaTemplate } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const MERGE_TAGS = [
  { tag: '{{candidateName}}', label: 'Candidate Name' },
  { tag: '{{companyName}}', label: 'Company Name' },
  { tag: '{{jobRole}}', label: 'Job Role' },
  { tag: '{{interviewDate}}', label: 'Drive Date' },
  { tag: '{{interviewTime}}', label: 'Drive Time' },
  { tag: '{{interviewLocation}}', label: 'Location / Link' },
];

export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate();

  // Data collections
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<VirtualGroup[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form selections
  const [selectedProvider, setSelectedProvider] = useState<'PERSONAL_ASSISTED' | 'CLOUD_API'>('PERSONAL_ASSISTED');
  const [campaignName, setCampaignName] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedMetaTemplateId, setSelectedMetaTemplateId] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');

  // Metadata inputs
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [interviewTime, setInterviewTime] = useState<string>('');
  const [interviewLocation, setInterviewLocation] = useState<string>('');
  const [customJobRole, setCustomJobRole] = useState<string>('');

  // Audience Preview State
  const [audiencePreview, setAudiencePreview] = useState<PreviewAudienceResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoadingInitial(true);
        const [compRes, grpRes, tmplRes, metaTmplRes] = await Promise.all([
          getCompanies({ limit: 100 }),
          getGroups({ limit: 100 }),
          templateService.getTemplates(),
          cloudApiService.getMetaTemplates().catch(() => []),
        ]);
        setCompanies(compRes.companies || []);
        setGroups(grpRes.groups || []);
        setTemplates(tmplRes || []);
        const approvedOnly = (metaTmplRes || []).filter((t: MetaTemplate) => t.status === 'APPROVED');
        setMetaTemplates(approvedOnly);
        if (approvedOnly.length > 0 && !selectedMetaTemplateId) {
          setSelectedMetaTemplateId(approvedOnly[0]._id);
        }
      } catch (err) {
        console.error('Failed to load campaign setup data:', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitial();
  }, []);

  // When company is selected, auto-select associated virtual group if available
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const matchingGroup = groups.find((g) => {
      const gCompId = typeof g.companyId === 'object' ? g.companyId._id : g.companyId;
      return gCompId === companyId;
    });

    if (matchingGroup) {
      setSelectedGroupId(matchingGroup._id);
      loadAudiencePreview(matchingGroup._id);
    } else {
      setSelectedGroupId('');
      setAudiencePreview(null);
    }

    const company = companies.find((c) => c._id === companyId);
    if (company) {
      if (!campaignName) {
        setCampaignName(`${company.companyName} - ${company.jobRole} Outreach`);
      }
      if (company.jobRole && !customJobRole) {
        setCustomJobRole(company.jobRole);
      }
      if (company.interviewLocation && !interviewLocation) {
        setInterviewLocation(company.interviewLocation);
      }
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (groupId) {
      loadAudiencePreview(groupId);
    } else {
      setAudiencePreview(null);
    }
  };

  const loadAudiencePreview = async (groupId: string) => {
    try {
      setPreviewLoading(true);
      setErrorMsg(null);
      const res = await campaignService.previewAudience(groupId);
      setAudiencePreview(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to evaluate group candidates');
      setAudiencePreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = templates.find((t) => t._id === templateId || t.templateId === templateId);
    if (found) {
      setMessageContent(found.content);
    }
  };

  const handleMetaTemplateChange = (metaTmplId: string) => {
    setSelectedMetaTemplateId(metaTmplId);
    const found = metaTemplates.find((t) => t._id === metaTmplId);
    if (found) {
      const body = found.components.find((c) => c.type === 'BODY')?.text || '';
      setMessageContent(body);
    }
  };

  const handleInsertTag = (tag: string) => {
    setMessageContent((prev) => `${prev} ${tag}`);
  };

  // Live interpolated preview generator
  const getSimulatedMessage = () => {
    if (!messageContent) return 'Select a template or write your message content...';

    const selectedCompany = companies.find((c) => c._id === selectedCompanyId);
    const candidateName =
      audiencePreview?.sampleRecipients?.[0]?.name || 'Rahul Sharma';

    return messageContent
      .replace(/\{\{\s*candidateName\s*\}\}/g, candidateName)
      .replace(/\{\{\s*companyName\s*\}\}/g, selectedCompany?.companyName || 'Apex Technologies')
      .replace(/\{\{\s*jobRole\s*\}\}/g, customJobRole || selectedCompany?.jobRole || 'Software Engineer')
      .replace(/\{\{\s*interviewDate\s*\}\}/g, interviewDate || 'Nov 28, 2026')
      .replace(/\{\{\s*interviewTime\s*\}\}/g, interviewTime || '10:00 AM')
      .replace(/\{\{\s*interviewLocation\s*\}\}/g, interviewLocation || 'Campus Auditorium');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!campaignName.trim()) {
      setErrorMsg('Please enter a campaign name.');
      return;
    }
    if (!selectedCompanyId) {
      setErrorMsg('Please select a target company.');
      return;
    }
    if (!selectedGroupId) {
      setErrorMsg('Please select a target virtual group.');
      return;
    }
    if (!messageContent.trim()) {
      setErrorMsg('Message content cannot be empty.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await campaignService.createCampaign({
        name: campaignName.trim(),
        companyId: selectedCompanyId,
        groupId: selectedGroupId,
        templateId: selectedTemplateId || undefined,
        metaTemplateId: selectedProvider === 'CLOUD_API' ? selectedMetaTemplateId : undefined,
        provider: selectedProvider,
        messageContent,
        metadata: {
          interviewDate: interviewDate.trim() || undefined,
          interviewTime: interviewTime.trim() || undefined,
          interviewLocation: interviewLocation.trim() || undefined,
          customJobRole: customJobRole.trim() || undefined,
        },
      });

      // Navigate to candidate personalization & validation hub
      navigate(`/whatsapp-messages/${res.campaign._id}/validation`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create and prepare campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/whatsapp-messages"
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create WhatsApp Campaign
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set up target audience, customize student merge tags, and prepare personal WhatsApp assisted dispatch.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Preparation Error</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Gateway Provider Selection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Select Messaging Gateway Provider *</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal WhatsApp Assisted */}
            <div
              onClick={() => setSelectedProvider('PERSONAL_ASSISTED')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                selectedProvider === 'PERSONAL_ASSISTED'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  selectedProvider === 'PERSONAL_ASSISTED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Personal WhatsApp (Assisted Mode)
                  </h3>
                  {selectedProvider === 'PERSONAL_ASSISTED' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generates individual official <code className="font-mono">wa.me</code> click-to-chat links for administrator review and manual dispatch. Zero bot automation; 100% safe for personal numbers.
                </p>
              </div>
            </div>

            {/* Official WhatsApp Cloud API */}
            <div
              onClick={() => setSelectedProvider('CLOUD_API')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                selectedProvider === 'CLOUD_API'
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  selectedProvider === 'CLOUD_API'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Cloud className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Official WhatsApp Cloud API (Automated)
                  </h3>
                  {selectedProvider === 'CLOUD_API' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Official Meta WhatsApp Business Cloud API. Sends approved templates automatically with real-time delivery webhooks (Sent, Delivered, Read receipts) and candidate replies tracking.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Target Audience */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Step 1: Select Target Company & Virtual Group</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Infosys Campus Drive - Shortlist Notification"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Company *
              </label>
              <select
                required
                value={selectedCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Company --</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName} ({c.jobRole})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Virtual Group *
              </label>
              <select
                required
                value={selectedGroupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Virtual Group --</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.groupName} ({g.memberCount || 0} active members)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Group Audience Readiness Breakdown */}
          {previewLoading && (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <LoadingSpinner size="sm" />
              <span>Analyzing WhatsApp consent & phone validations...</span>
            </div>
          )}

          {audiencePreview && !previewLoading && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Audience Readiness Assessment
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Total Active Members: {audiencePreview.totalMembers}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Eligible for Dispatch</span>
                  </div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {audiencePreview.eligibleCount}
                  </div>
                  <span className="text-[10px] text-emerald-600">
                    Consent granted & valid phone
                  </span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Excluded (No Consent)</span>
                  </div>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {audiencePreview.unconsentedCount}
                  </div>
                  <span className="text-[10px] text-amber-600">
                    WhatsApp opt-in required
                  </span>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-1.5 text-blue-800 text-xs font-semibold">
                    <Info className="w-3.5 h-3.5" />
                    <span>Delivery Mode</span>
                  </div>
                  <div className="text-xs font-bold text-blue-800 mt-1">
                    Personal WhatsApp
                  </div>
                  <span className="text-[10px] text-blue-600">
                    1-click wa.me assisted links
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Message Template & Content */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileCode2 className={`w-4 h-4 ${selectedProvider === 'CLOUD_API' ? 'text-blue-600' : 'text-emerald-600'}`} />
              <span>
                {selectedProvider === 'CLOUD_API'
                  ? 'Step 2: Approved Meta WhatsApp Template'
                  : 'Step 2: Message Template & Content'}
              </span>
            </div>
            {selectedProvider === 'CLOUD_API' ? (
              <Link
                to="/meta-templates"
                target="_blank"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Meta Templates Catalog ↗
              </Link>
            ) : (
              <Link
                to="/message-templates"
                target="_blank"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Manage Templates ↗
              </Link>
            )}
          </div>

          {selectedProvider === 'CLOUD_API' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Approved Meta Template *
              </label>
              <select
                required
                value={selectedMetaTemplateId}
                onChange={(e) => handleMetaTemplateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Choose Approved Meta Template --</option>
                {metaTemplates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.category} • {t.language}) - APPROVED
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Only approved templates can be used for automated messaging outside the 24-hr customer support window.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Predefined Template (Optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Start with Blank Message or Custom Text --</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.category.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Merge Tag Chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Insert Personalization Tags (Click to insert):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag.tag}
                  type="button"
                  onClick={() => handleInsertTag(tag.tag)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 rounded-md text-[11px] font-mono transition-colors"
                >
                  {tag.tag} <span className="text-[10px] text-slate-400">({tag.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message Text *
            </label>
            <textarea
              required
              rows={6}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Dear {{candidateName}}, you have been shortlisted for {{companyName}} for the role of {{jobRole}}..."
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Supports emojis and multiple paragraphs.</span>
              <span>{messageContent.length} characters</span>
            </div>
          </div>

          {/* Drive Specific Metadata */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 block mb-2">
              Drive Specific Parameters (Replaces merge tags)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Interview Date
                </label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Interview Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Location / Mode
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zoom / Auditorium"
                  value={interviewLocation}
                  onChange={(e) => setInterviewLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Role Title (Override)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trainee Engineer"
                  value={customJobRole}
                  onChange={(e) => setCustomJobRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Live Personalized Preview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Step 3: Live WhatsApp Chat Balloon Preview</span>
          </div>
          <p className="text-xs text-slate-500">
            Preview how your student will see the dispatched message in their WhatsApp chat.
          </p>

          <div className="bg-slate-100 p-4 rounded-xl max-w-lg border border-slate-200">
            <div className="bg-emerald-50 text-slate-800 p-3.5 rounded-lg rounded-tr-none shadow-xs text-xs whitespace-pre-wrap leading-relaxed border border-emerald-100 relative">
              {getSimulatedMessage()}
              <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                <span>10:30 AM</span>
                <span className="text-blue-500 font-bold">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to="/whatsapp-messages"
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={Boolean(submitting || (audiencePreview && audiencePreview.eligibleCount === 0))}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Preparing Recipient Queue...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Prepare & Start Assisted Dispatch</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
