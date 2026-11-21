import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  RotateCcw,
  UserX,
  Play,
  Check,
} from 'lucide-react';
import { campaignService } from '../services/campaignService';
import { WhatsAppCampaign, CampaignRecipient, ValidationSummaryData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CampaignValidationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<WhatsAppCampaign | null>(null);
  const [summary, setSummary] = useState<ValidationSummaryData | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('ALL');

  // Candidate inline editor state
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);
  const [editedMessageText, setEditedMessageText] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Exclude modal
  const [isExcludeModalOpen, setIsExcludeModalOpen] = useState<boolean>(false);
  const [excludeReason, setExcludeReason] = useState<string>('Missing required candidate information');

  const loadCampaignAndRecipients = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [campData, sumData, recData] = await Promise.all([
        campaignService.getCampaignById(id),
        campaignService.getValidationSummary(id),
        campaignService.getCampaignRecipients(id, {
          personalizationStatus: filter !== 'ALL' && filter !== 'APPROVED' && filter !== 'EXCLUDED' ? filter : undefined,
          isApproved: filter === 'APPROVED' ? true : undefined,
          isExcluded: filter === 'EXCLUDED' ? true : undefined,
          limit: 100,
        }),
      ]);
      setCampaign(campData);
      setSummary(sumData);
      setRecipients(recData.recipients);
      if (currentIndex >= recData.recipients.length) {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to load campaign validation hub:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaignAndRecipients();
  }, [id, filter]);

  const currentRecipient = recipients[currentIndex] || null;

  useEffect(() => {
    if (currentRecipient) {
      setEditedMessageText(currentRecipient.personalizedMessage);
      setIsEditingInline(false);
    }
  }, [currentIndex, currentRecipient?._id]);

  const handleSaveIndividualEdit = async () => {
    if (!id || !currentRecipient) return;
    try {
      setActionLoading(true);
      await campaignService.updateRecipientMessage(id, currentRecipient._id, editedMessageText);
      setIsEditingInline(false);
      setActionSuccess('Candidate message updated successfully. Original template remains unchanged.');
      setTimeout(() => setActionSuccess(null), 3000);
      loadCampaignAndRecipients();
    } catch (err: any) {
      alert(err.message || 'Failed to save individual edit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetToTemplate = async () => {
    if (!id || !currentRecipient) return;
    if (!window.confirm('Reset this candidate message back to original template personalization?')) return;
    try {
      setActionLoading(true);
      await campaignService.resetRecipientMessage(id, currentRecipient._id);
      setIsEditingInline(false);
      setActionSuccess('Candidate message reset back to template personalization.');
      setTimeout(() => setActionSuccess(null), 3000);
      loadCampaignAndRecipients();
    } catch (err: any) {
      alert(err.message || 'Failed to reset message');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveCurrent = async () => {
    if (!id || !currentRecipient) return;
    try {
      setActionLoading(true);
      await campaignService.approveRecipient(id, currentRecipient._id);
      loadCampaignAndRecipients();
    } catch (err: any) {
      alert(err.message || 'Failed to approve message');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExcludeCurrent = async () => {
    if (!id || !currentRecipient) return;
    try {
      setActionLoading(true);
      setIsExcludeModalOpen(false);
      await campaignService.excludeRecipient(id, currentRecipient._id, excludeReason);
      loadCampaignAndRecipients();
    } catch (err: any) {
      alert(err.message || 'Failed to exclude candidate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAllValid = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await campaignService.approveAllValid(id);
      setActionSuccess(`Approved ${res.approvedCount} valid candidate messages.`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadCampaignAndRecipients();
    } catch (err: any) {
      alert(err.message || 'Failed to approve valid messages');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExcludeAllIncomplete = async () => {
    if (!id) return;
    if (!window.confirm('Exclude all candidates who have missing source fields or invalid placeholders?')) return;
    try {
      setActionLoading(true);
      const res = await campaignService.excludeAllIncomplete(id);
      setActionSuccess(`Excluded ${res.excludedCount} candidates with incomplete data.`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadCampaignAndRecipients();
    } catch (err: any) {
      alert(err.message || 'Failed to exclude incomplete candidates');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !campaign) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const company = typeof campaign?.companyId === 'object' ? campaign.companyId : null;
  const candidate = typeof currentRecipient?.candidateId === 'object' ? currentRecipient.candidateId : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/whatsapp-messages/${id}`}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Personalization & Campaign Validation Hub
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Pre-Send Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {campaign?.name} • {company?.companyName} ({company?.jobRole})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/whatsapp-messages/${id}/process`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Proceed to Assisted Dispatch</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* SECTION 1: Bulk Validation Summary Cards */}
      {summary && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Campaign Validation Summary
              </h2>
              <p className="text-xs text-slate-500">
                Review personalization health across all {summary.totalRecipients} candidates before sending.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={actionLoading || summary.warningCount + summary.errorCount === 0}
                onClick={handleExcludeAllIncomplete}
                className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg disabled:opacity-40"
              >
                Exclude All Incomplete
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApproveAllValid}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
              >
                Approve All Valid Messages
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-medium">Total Candidates</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.totalRecipients}</div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[11px] text-emerald-700 font-medium">Valid & Ready</span>
              <div className="text-lg font-bold text-emerald-700 mt-0.5">{summary.validCount}</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-[11px] text-amber-700 font-medium">Missing Fields</span>
              <div className="text-lg font-bold text-amber-700 mt-0.5">{summary.warningCount}</div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-[11px] text-purple-700 font-medium">Manually Edited</span>
              <div className="text-lg font-bold text-purple-700 mt-0.5">{summary.manuallyEditedCount}</div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-[11px] text-blue-700 font-medium">Approved to Send</span>
              <div className="text-lg font-bold text-blue-700 mt-0.5">{summary.approvedCount}</div>
            </div>

            <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-medium">Excluded</span>
              <div className="text-lg font-bold text-slate-600 mt-0.5">{summary.excludedCount}</div>
            </div>
          </div>

          {/* Missing fields breakdown */}
          {Object.keys(summary.missingFieldFrequency).length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">
                  Detected Missing Fields Frequency:
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(summary.missingFieldFrequency).map(([field, count]) => (
                    <span key={field} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700">
                      {field}: <strong className="text-amber-700">{count}</strong> candidates
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs for Candidate Review */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { key: 'ALL', label: 'All Candidates' },
          { key: 'VALID', label: 'Valid Messages' },
          { key: 'WARNING_MISSING_DATA', label: 'Missing Fields' },
          { key: 'MANUALLY_EDITED', label: 'Manually Edited' },
          { key: 'APPROVED', label: 'Approved Only' },
          { key: 'EXCLUDED', label: 'Excluded' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 2: Individual Candidate Message Previewer & Inline Editor */}
      {recipients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          No candidates found matching the selected filter.
        </div>
      ) : currentRecipient && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {/* Candidate Carousel Bar */}
          <div className="p-4 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Candidate {currentIndex + 1} of {recipients.length}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                {currentRecipient.candidateName}
              </span>

              {currentRecipient.isExcluded ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                  Excluded
                </span>
              ) : currentRecipient.isApproved ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Approved
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Pending Approval
                </span>
              )}

              {currentRecipient.manuallyEdited && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                  Candidate Override Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                disabled={currentIndex === recipients.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(recipients.length - 1, prev + 1))}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Candidate Info Grid */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Academic Profile:</span>
              <span className="font-semibold text-slate-800 block">
                {candidate?.collegeName || 'N/A'}
              </span>
              <span className="text-slate-500 text-[11px]">
                {candidate?.degree} • {candidate?.branch} ({candidate?.passingYear || 'N/A'})
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Contact Details:</span>
              <span className="font-mono text-slate-800 block">
                {currentRecipient.normalizedPhoneNumber}
              </span>
              <span className="text-slate-500 text-[11px]">
                {candidate?.email || 'No email provided'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Skills Profile:</span>
              <span className="text-slate-700 text-[11px] line-clamp-2">
                {Array.isArray(candidate?.skills) && candidate.skills.length > 0
                  ? candidate.skills.join(', ')
                  : 'No skills recorded'}
              </span>
            </div>

            <div className="flex flex-col justify-center items-end gap-1.5">
              {currentRecipient.isExcluded ? (
                <button
                  type="button"
                  onClick={handleApproveCurrent}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                  Restore Candidate
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExcludeModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
                  >
                    <UserX className="w-3.5 h-3.5 text-slate-500" />
                    Exclude
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveCurrent}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Missing Fields Warning Banner */}
          {currentRecipient.missingFields && currentRecipient.missingFields.length > 0 && !currentRecipient.manuallyEdited && (
            <div className="p-4 bg-amber-50/80 border-y border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Missing Information Alert:</span>
                <p className="mt-0.5 text-amber-800">
                  This candidate is missing source data for: <strong className="font-mono">{currentRecipient.missingFields.join(', ')}</strong>.
                  You can click <strong>"Edit This Message"</strong> below to supply custom details for this candidate without altering the original template.
                </p>
              </div>
            </div>
          )}

          {/* Message Area: Display OR Inline Edit */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Personalized WhatsApp Output
              </span>

              <div className="flex items-center gap-2">
                {currentRecipient.manuallyEdited && (
                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Template
                  </button>
                )}
                {!isEditingInline ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingInline(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit This Message
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingInline(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleSaveIndividualEdit}
                      className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Candidate Override
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isEditingInline ? (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={editedMessageText}
                  onChange={(e) => setEditedMessageText(e.target.value)}
                  className="w-full p-4 font-mono text-xs leading-relaxed rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 block">
                  Edits made here apply solely to {currentRecipient.candidateName} and will not modify the reusable template.
                </span>
              </div>
            ) : (
              <div className="bg-slate-100 p-4 rounded-xl max-w-xl border border-slate-200">
                <div className="bg-emerald-50 text-slate-900 p-4 rounded-xl rounded-tr-none shadow-xs text-xs font-sans whitespace-pre-wrap leading-relaxed border border-emerald-200">
                  {currentRecipient.personalizedMessage}
                  <div className="text-[10px] text-slate-400 text-right mt-2 flex items-center justify-end gap-1 font-mono">
                    <span>10:30 AM</span>
                    <span className="text-emerald-600 font-bold">✓</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exclude Modal */}
      {isExcludeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Exclude Candidate from Campaign?
            </h3>
            <p className="text-xs text-slate-500">
              This will mark the candidate as excluded from this messaging drive. They will not be contacted in the assisted workflow.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for exclusion:
              </label>
              <input
                type="text"
                value={excludeReason}
                onChange={(e) => setExcludeReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExcludeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExcludeCurrent}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Exclusion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
