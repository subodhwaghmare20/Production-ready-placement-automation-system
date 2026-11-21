import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  History,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { CampaignRecipient, RecipientAttempt } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

export const RecipientTrackingPage: React.FC = () => {
  const [recipients, setRecipients] = useState<
    Array<
      CampaignRecipient & {
        displayPhoneNumber: string;
        campaignName?: string;
        companyName?: string;
      }
    >
  >([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [unmaskAll, setUnmaskAll] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Attempt History Modal
  const [selectedRecipient, setSelectedRecipient] = useState<CampaignRecipient | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getRecipients({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        unmaskPhone: unmaskAll,
        page,
        limit,
      });
      setRecipients(res.recipients);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load recipient tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, unmaskAll, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT_MANUALLY_CONFIRMED':
        return <Badge variant="success">Confirmed Sent</Badge>;
      case 'CHAT_OPENED':
        return <Badge variant="warning">Chat Opened</Badge>;
      case 'SKIPPED':
        return <Badge variant="default">Skipped</Badge>;
      case 'FAILED_TO_OPEN':
        return <Badge variant="danger">Failed to Open</Badge>;
      case 'READY':
      case 'PENDING':
        return <Badge variant="info">Ready in Queue</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Recipient-Level Outreach Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit candidate WhatsApp messaging activity, attempt histories, and dispatch status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Authorized unmask toggle button */}
          <button
            onClick={() => setUnmaskAll(!unmaskAll)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
              unmaskAll
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {unmaskAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{unmaskAll ? 'Mask Numbers' : 'Reveal Numbers (Admin)'}</span>
          </button>

          <button
            onClick={() => loadData()}
            className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Refresh Table"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search candidate name or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'SENT_MANUALLY_CONFIRMED', label: 'Confirmed Sent' },
            { id: 'CHAT_OPENED', label: 'Chat Opened' },
            { id: 'READY', label: 'Ready' },
            { id: 'SKIPPED', label: 'Skipped' },
            { id: 'FAILED_TO_OPEN', label: 'Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading && recipients.length === 0 ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No recipient records found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Phone (Privacy)</th>
                  <th className="py-3 px-4">Target Company & Campaign</th>
                  <th className="py-3 px-4">WhatsApp Status</th>
                  <th className="py-3 px-4">Attempts & Audit</th>
                  <th className="py-3 px-4">Last Action</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((r) => {
                  const candidate = typeof r.candidateId === 'object' ? r.candidateId : null;
                  const attemptCount = r.attemptHistory?.length || 0;
                  const lastActionDate =
                    r.manuallyConfirmedAt || r.chatOpenedAt || r.skippedAt || r.updatedAt;

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Candidate */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {r.candidateName || candidate?.fullName || 'Unknown Candidate'}
                        </div>
                        {candidate?.candidateId && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {candidate.candidateId}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{r.displayPhoneNumber}</span>
                        </div>
                      </td>

                      {/* Company & Campaign */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{r.companyName || 'Unknown Company'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {r.campaignName || 'Campaign'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(r.status)}
                          {r.manuallyEdited && (
                            <span className="inline-block px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-semibold ml-1">
                              Custom Text
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attempts */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedRecipient(r)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        >
                          <History className="w-3 h-3 text-slate-500" />
                          <span>{attemptCount} {attemptCount === 1 ? 'Attempt' : 'Attempts'}</span>
                        </button>
                      </td>

                      {/* Last Action */}
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {lastActionDate ? new Date(lastActionDate).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By: {r.lastActionByName || 'Administrator'}
                        </div>
                      </td>

                      {/* Error or Notes */}
                      <td className="py-3 px-4 text-right">
                        {r.errorDetails ? (
                          <span
                            title={r.errorDetails}
                            className="inline-block px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] truncate max-w-[140px]"
                          >
                            {r.errorDetails}
                          </span>
                        ) : r.skipReason ? (
                          <span
                            title={r.skipReason}
                            className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] truncate max-w-[140px]"
                          >
                            {r.skipReason}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} recipients
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attempt History Modal */}
      {selectedRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Attempt History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidate: <span className="font-semibold">{selectedRecipient.candidateName}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRecipient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Chronological Attempts */}
            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {(!selectedRecipient.attemptHistory || selectedRecipient.attemptHistory.length === 0) ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  No individual outreach attempts recorded yet.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedRecipient.attemptHistory.map((att: RecipientAttempt, i: number) => (
                    <div key={i} className="relative">
                      {/* Bullet dot */}
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-xs" />

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 text-xs">
                            Attempt #{att.attemptNumber}: {att.action}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(att.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">Status:</span>
                          {getStatusBadge(att.status)}
                        </div>

                        {att.notes && (
                          <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                            Notes: {att.notes}
                          </p>
                        )}

                        {att.errorDetails && (
                          <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                            Error: {att.errorDetails}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-400 pt-1">
                          Actor: {att.performedByName || 'Administrator'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRecipient(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
