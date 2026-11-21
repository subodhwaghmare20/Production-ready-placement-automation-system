import React, { useState, useEffect } from 'react';
import {
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
  ShieldAlert,
  X,
  RotateCcw,
} from 'lucide-react';
import { cloudApiService } from '../services/cloudApiService';
import { WebhookEventData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const WebhookEventsPage: React.FC = () => {
  const [events, setEvents] = useState<WebhookEventData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [inspectingEvent, setInspectingEvent] = useState<WebhookEventData | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await cloudApiService.getWebhookEvents({
        page,
        limit: 15,
        eventType: eventTypeFilter || undefined,
        processingStatus: statusFilter || undefined,
      });
      setEvents(res.events);
      setTotalPages(res.pagination.pages || 1);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load webhook events' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, eventTypeFilter, statusFilter]);

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    setMessage(null);
    try {
      const res = await cloudApiService.reprocessWebhookEvent(id);
      setMessage({ type: 'success', text: res.message });
      loadEvents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reprocess webhook event' });
    } finally {
      setReprocessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Processed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Webhook Events &amp; Delivery Audit Log
              </h1>
              <p className="text-sm text-slate-500">
                Live audit trail of real-time callbacks received from Meta's WhatsApp servers
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadEvents}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="text-sm font-medium">{message.text}</div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="">All Event Types</option>
            <option value="messages">messages</option>
            <option value="message_status">message_status</option>
            <option value="template_status">template_status</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="">All Processing Statuses</option>
            <option value="PROCESSED">PROCESSED</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing page <span className="font-bold text-slate-800">{page}</span> of{' '}
          <span className="font-bold text-slate-800">{totalPages}</span>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <Server className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Webhook Notifications Recorded</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Incoming callbacks from Meta (message delivery receipts, candidate responses, and account events) will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">HMAC Signature</th>
                  <th className="py-3 px-4">Processing Status</th>
                  <th className="py-3 px-4">Received Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {evt.eventId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {evt.signatureVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified SHA-256
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Test / Unsigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(evt.processingStatus)}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(evt.receivedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => setInspectingEvent(evt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <Eye className="w-3 h-3" /> Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReprocess(evt._id)}
                        disabled={reprocessingId === evt._id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition disabled:opacity-50"
                        title="Reprocess Webhook"
                      >
                        <RotateCcw className={`w-3 h-3 ${reprocessingId === evt._id ? 'animate-spin' : ''}`} />
                        Reprocess
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* JSON Payload Inspection Modal */}
      {inspectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Webhook Payload: {inspectingEvent.eventId}
                </h3>
                <p className="text-xs text-slate-500">
                  Received on {new Date(inspectingEvent.receivedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectingEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs bg-slate-900 text-emerald-400 rounded-b-2xl">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(inspectingEvent.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
