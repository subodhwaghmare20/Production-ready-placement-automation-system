import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  SkipForward,
  Pause,
  Play,
  Sparkles,
  AlertCircle,
  GraduationCap,
  Phone,
  Check,
} from 'lucide-react';
import { campaignService, GetNextRecipientResponse } from '../services/campaignService';
import { WhatsAppCampaign, CampaignRecipient } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CampaignProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<WhatsAppCampaign | null>(null);
  const [currentRecipient, setCurrentRecipient] = useState<CampaignRecipient | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalEligible, setTotalEligible] = useState<number>(0);
  const [remainingCount, setRemainingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Skip modal
  const [isSkipModalOpen, setIsSkipModalOpen] = useState<boolean>(false);
  const [skipReason, setSkipReason] = useState<string>('Candidate unreachable or requested exclusion');

  // Load next candidate in queue
  const loadNext = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res: GetNextRecipientResponse = await campaignService.getNextRecipient(id);
      setCampaign(res.campaign);
      setCurrentRecipient(res.recipient);
      setCurrentIndex(res.currentIndex);
      setTotalEligible(res.totalEligible);
      setRemainingCount(res.remainingCount);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load recipient queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNext();
  }, [id]);

  // Action: Open Chat in WhatsApp
  const handleOpenChat = async () => {
    if (!id || !currentRecipient) return;

    try {
      // 1. Open official click-to-chat URL in new window/tab
      window.open(currentRecipient.clickToChatUrl, '_blank', 'noopener,noreferrer');

      // 2. Record status change to CHAT_OPENED in backend
      const updated = await campaignService.markChatOpened(id, currentRecipient._id);
      setCurrentRecipient(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record chat opened');
    }
  };

  // Action: Confirm Sent Manually
  const handleConfirmSent = async () => {
    if (!id || !currentRecipient) return;

    try {
      setActionLoading(true);
      const result = await campaignService.confirmManualSend(id, currentRecipient._id);

      if (result.isCompleted) {
        // Re-fetch to get completed status
        await loadNext();
      } else {
        // Automatically fetch next candidate
        await loadNext();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to confirm manual dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Skip Recipient
  const handleConfirmSkip = async () => {
    if (!id || !currentRecipient) return;

    try {
      setActionLoading(true);
      setIsSkipModalOpen(false);
      await campaignService.skipRecipient(id, currentRecipient._id, skipReason);
      await loadNext();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to skip recipient');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Pause or Resume Campaign
  const handleTogglePause = async () => {
    if (!id || !campaign) return;
    const newStatus = campaign.status === 'PAUSED' ? 'IN_PROGRESS' : 'PAUSED';
    try {
      const updated = await campaignService.updateCampaignStatus(id, newStatus);
      setCampaign(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update campaign state');
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
  const isAllCompleted = !currentRecipient || campaign?.status === 'COMPLETED' || remainingCount === 0;

  const confirmedCount = campaign?.metrics?.manuallyConfirmedCount || 0;
  const skippedCount = campaign?.metrics?.skippedCount || 0;
  const progressPct =
    totalEligible > 0 ? Math.round(((confirmedCount + skippedCount) / totalEligible) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/whatsapp-messages"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {campaign?.name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                Assisted Sender
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {company?.companyName} • {company?.jobRole} • Personal WhatsApp Assisted Flow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isAllCompleted && (
            <button
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              {campaign?.status === 'PAUSED' ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  Pause
                </>
              )}
            </button>
          )}

          <Link
            to={`/whatsapp-messages/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            Audit Log
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Notice</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Progress Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1">
          <span className="font-semibold text-slate-900 text-sm">
            {isAllCompleted
              ? 'Campaign Finished'
              : `Recipient ${currentIndex} of ${totalEligible}`}
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-600 font-medium">
              ✓ {confirmedCount} Confirmed
            </span>
            <span className="text-slate-400 font-medium">
              ↷ {skippedCount} Skipped
            </span>
            <span className="font-bold text-slate-800">{progressPct}% Complete</span>
          </div>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              progressPct === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Completion View */}
      {isAllCompleted ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              All Campaign Candidates Processed!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              You have reviewed and processed every eligible student in this recruitment drive.
              All confirmations are logged in the institutional database.
            </p>
          </div>

          <div className="flex justify-center gap-6 text-xs py-3 border-y border-slate-100 max-w-sm mx-auto">
            <div>
              <span className="text-slate-400 block">Total Eligible</span>
              <span className="text-lg font-bold text-slate-900">{totalEligible}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Confirmed Sent</span>
              <span className="text-lg font-bold text-emerald-600">{confirmedCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Skipped</span>
              <span className="text-lg font-bold text-slate-500">{skippedCount}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              to={`/whatsapp-messages/${id}`}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              View Campaign Audit
            </Link>
            <Link
              to="/whatsapp-messages"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Back to Campaigns
            </Link>
          </div>
        </div>
      ) : (
        /* Active Candidate Card & Action Panel */
        currentRecipient && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {/* Candidate Metadata Banner */}
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {currentRecipient.candidateName}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      #{currentRecipient.queueOrder}
                    </span>
                    {currentRecipient.status === 'CHAT_OPENED' && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Chat Opened
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {currentRecipient.normalizedPhoneNumber}
                    </span>
                    {typeof currentRecipient.candidateId === 'object' && (
                      <>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          {currentRecipient.candidateId.collegeName || 'Institutional Candidate'}
                        </span>
                        {currentRecipient.candidateId.branch && (
                          <span>• {currentRecipient.candidateId.branch}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSkipModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip Candidate
                  </button>
                </div>
              </div>
            </div>

            {/* Personalized Message Preview (WhatsApp Balloon) */}
            <div className="p-6 bg-slate-50/60 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Personalized Message Prepared for Candidate:
              </span>

              <div className="bg-emerald-50 text-slate-900 p-4 rounded-xl rounded-tr-none border border-emerald-200 text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-xs max-w-xl">
                {currentRecipient.personalizedMessage}
                <div className="text-[10px] text-slate-400 text-right mt-2 flex items-center justify-end gap-1">
                  <span>Prepared for Assisted Dispatch</span>
                  <span className="text-emerald-600 font-bold">✓</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800 block">
                  Step 1: Open chat link in WhatsApp Web/Desktop.
                </span>
                <span>Step 2: Press Send in WhatsApp, then click Confirm below.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* 1-Click WhatsApp Trigger */}
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  <span>Open Chat in WhatsApp</span>
                </button>

                {/* Confirm Sent Button */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmSent}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {actionLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mark Sent (Confirm & Next)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Skip Modal */}
      {isSkipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Skip Candidate from Dispatch?
            </h3>
            <p className="text-xs text-slate-500">
              This candidate will be recorded as Skipped with your reason. You can review or re-dispatch to them later from the audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for skipping:
              </label>
              <select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Candidate unreachable or requested exclusion">
                  Candidate unreachable or requested exclusion
                </option>
                <option value="Already contacted through phone call">
                  Already contacted through phone call
                </option>
                <option value="Candidate opted out of current drive">
                  Candidate opted out of current drive
                </option>
                <option value="Disqualified or placed elsewhere">
                  Disqualified or placed elsewhere
                </option>
                <option value="Other administrative reason">
                  Other administrative reason
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
