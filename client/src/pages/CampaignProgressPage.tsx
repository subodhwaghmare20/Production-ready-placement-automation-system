import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  Pause,
  Play,
  XCircle,
  RefreshCw,
  Search,
  Send,
  Building2,
  FolderTree,
  Eye,
  CheckCheck,
  Check,
} from 'lucide-react';
import { campaignService } from '../services/campaignService';
import { cloudApiService } from '../services/cloudApiService';
import { WhatsAppCampaign, CampaignRecipient } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CampaignProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<WhatsAppCampaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filters for recipient list
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const pollIntervalRef = useRef<any>(null);

  const fetchCampaignData = useCallback(async (isInitial = false) => {
    if (!id) return;
    try {
      if (isInitial) setLoading(true);
      const [campData, recRes] = await Promise.all([
        campaignService.getCampaignById(id),
        campaignService.getCampaignRecipients(id, { limit: 500 }),
      ]);
      setCampaign(campData);
      setRecipients(recRes.recipients || []);
    } catch (err: any) {
      if (isInitial) {
        setError(err.response?.data?.message || 'Failed to load campaign data');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaignData(true);
  }, [fetchCampaignData]);

  // Real-time polling while active
  useEffect(() => {
    if (!campaign) return;
    const activeStatuses = ['PROCESSING', 'RUNNING', 'PENDING', 'QUEUED', 'SENDING'];
    const isActive = activeStatuses.includes(campaign.status?.toUpperCase() || '');

    if (isActive) {
      pollIntervalRef.current = setInterval(() => {
        fetchCampaignData(false);
      }, 3000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [campaign?.status, fetchCampaignData]);

  // Action Handlers
  const handlePause = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await cloudApiService.pauseCampaign(id);
      await fetchCampaignData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await cloudApiService.resumeCampaign(id);
      await fetchCampaignData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to cancel the remaining unsent messages?')) return;
    try {
      setActionLoading(true);
      await cloudApiService.cancelCampaign(id);
      await fetchCampaignData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDispatch = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await cloudApiService.startCampaign(id);
      await fetchCampaignData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to start dispatch. Please verify WhatsApp credentials in Settings.');
    } finally {
      setActionLoading(false);
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

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <Link
          to="/send-message"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-semibold">{error || 'Campaign not found'}</p>
        </div>
      </div>
    );
  }

  // Calculate statistics using effective status
  const total = campaign.totalRecipients || recipients.length || 0;
  const sent = recipients.filter((r) => ['SENT', 'DELIVERED', 'READ'].includes(getRecipientStatus(r))).length;
  const delivered = recipients.filter((r) => ['DELIVERED', 'READ'].includes(getRecipientStatus(r))).length;
  const read = recipients.filter((r) => getRecipientStatus(r) === 'READ').length;
  const failed = recipients.filter((r) => getRecipientStatus(r) === 'FAILED').length;
  const pending = Math.max(0, total - (sent + failed));

  const progressPercent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  const companyName =
    typeof campaign.companyId === 'object' && campaign.companyId
      ? campaign.companyId.companyName
      : 'Company';

  const groupName =
    typeof campaign.groupId === 'object' && campaign.groupId
      ? campaign.groupId.groupName
      : 'Group';

  const isCompleted = ['COMPLETED', 'FINISHED'].includes(campaign.status?.toUpperCase() || '');
  const isPaused = campaign.status?.toUpperCase() === 'PAUSED';
  const isRunning = ['PROCESSING', 'RUNNING', 'SENDING', 'IN_PROGRESS'].includes(campaign.status?.toUpperCase() || '');
  const isPendingStart = ['PREPARED', 'DRAFT', 'READY'].includes(campaign.status?.toUpperCase() || '');

  // Filtered recipients
  const filteredRecipients = recipients.filter((r) => {
    const status = getRecipientStatus(r);
    if (statusFilter !== 'ALL' && status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      const phone = (r.phoneNumber || '').toLowerCase();
      const name = (r.candidateName || '').toLowerCase();
      return phone.includes(s) || name.includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/send-message"
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 gap-1 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Send Message
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isPaused
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : isRunning
                  ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {campaign.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> {companyName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FolderTree className="h-3.5 w-3.5" /> {groupName}
            </span>
            <span>•</span>
            <span>Started {new Date(campaign.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isPendingStart && (
            <button
              onClick={handleStartDispatch}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Start Dispatch / Send Now
            </button>
          )}

          {isRunning && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 gap-1.5"
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 gap-1.5"
            >
              <Play className="h-4 w-4" /> Resume
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 gap-1.5"
            >
              <XCircle className="h-4 w-4" /> Cancel Remaining
            </button>
          )}

          <Link
            to="/send-message"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs gap-1.5"
          >
            <Send className="h-4 w-4" /> Send Another Message
          </Link>
        </div>
      </div>

      {/* Live Dispatch Progress Bar Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <span>Overall Dispatch Progress</span>
            {isRunning && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Live Auto-updating
              </span>
            )}
          </div>
          <div className="font-mono font-bold text-slate-900 text-base">
            {progressPercent}%{' '}
            <span className="text-xs text-slate-500 font-normal">
              ({sent + failed} / {total})
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-500 h-full"
            style={{ width: `${total > 0 ? (sent / total) * 100 : 0}%` }}
            title={`Sent: ${sent}`}
          />
          <div
            className="bg-red-500 transition-all duration-500 h-full"
            style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }}
            title={`Failed: ${failed}`}
          />
        </div>

        {/* Stat Counter Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
            <div className="text-xl font-extrabold text-blue-700 font-mono">{sent}</div>
            <div className="text-xs font-semibold text-blue-900 mt-0.5 flex items-center justify-center gap-1">
              <Check className="h-3.5 w-3.5" /> Sent
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
            <div className="text-xl font-extrabold text-emerald-700 font-mono">{delivered}</div>
            <div className="text-xs font-semibold text-emerald-900 mt-0.5 flex items-center justify-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Delivered
            </div>
          </div>

          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-center">
            <div className="text-xl font-extrabold text-teal-700 font-mono">{read}</div>
            <div className="text-xs font-semibold text-teal-900 mt-0.5 flex items-center justify-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Read
            </div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-center">
            <div className="text-xl font-extrabold text-red-700 font-mono">{failed}</div>
            <div className="text-xs font-semibold text-red-900 mt-0.5 flex items-center justify-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Failed
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center col-span-2 sm:col-span-1">
            <div className="text-xl font-extrabold text-slate-700 font-mono">{pending}</div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Pending
            </div>
          </div>
        </div>
      </div>

      {/* Message Content Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Message Sent
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap font-sans">
          {campaign.messageContent || 'Template message'}
        </div>
      </div>

      {/* Recipient Status Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Recipient Delivery Log ({filteredRecipients.length} of {recipients.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="READ">Read</option>
              <option value="DELIVERED">Delivered</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>

            {/* Search Input */}
            <div className="relative w-48 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone/name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {filteredRecipients.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No recipients matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">Mobile Number</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4">Details / Errors</th>
                  <th className="py-2.5 px-4 text-right">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredRecipients.map((r, idx) => {
                  const status = getRecipientStatus(r);
                  let badge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      PENDING
                    </span>
                  );

                  if (status === 'READ') {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 flex items-center gap-1 justify-center">
                        <Eye className="h-3 w-3" /> READ
                      </span>
                    );
                  } else if (status === 'DELIVERED') {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 justify-center">
                        <CheckCheck className="h-3 w-3" /> DELIVERED
                      </span>
                    );
                  } else if (status === 'SENT') {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1 justify-center">
                        <Check className="h-3 w-3" /> SENT
                      </span>
                    );
                  } else if (status === 'FAILED') {
                    badge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 justify-center">
                        <AlertCircle className="h-3 w-3" /> FAILED
                      </span>
                    );
                  }

                  const errorText = (r as any).providerErrorMessage || r.errorMessage;
                  const messageId = (r as any).providerMessageId || r.metaMessageId;

                  return (
                    <tr key={r._id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                        {r.phoneNumber}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-700">
                        {r.candidateName || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">{badge}</td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                        {errorText ? (
                          <span className="text-red-600 font-medium">{errorText}</span>
                        ) : messageId ? (
                          <span className="font-mono text-[10px] text-slate-400">
                            ID: {messageId}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400 text-[11px]">
                        {new Date(r.updatedAt || r.sentAt || campaign.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
