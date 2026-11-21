import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  User,
  ShieldAlert,
  Clock,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { cloudApiService } from '../services/cloudApiService';
import { InboundMessageData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const InboundMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<InboundMessageData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<InboundMessageData | null>(null);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await cloudApiService.getInboundMessages({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setMessages(res.messages);
      setUnreadCount(res.unreadCount);
      setTotalPages(res.pagination.pages || 1);
      if (res.messages.length > 0 && !selectedMessage) {
        setSelectedMessage(res.messages[0]);
      }
    } catch (err: any) {
      console.error('Failed to load inbound messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMessages();
  };

  const handleMarkStatus = async (id: string, newStatus: 'READ' | 'RESOLVED') => {
    try {
      const updated = await cloudApiService.updateInboundMessageStatus(id, newStatus);
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, processingStatus: updated.processingStatus } : m)));
      if (selectedMessage?._id === id) {
        setSelectedMessage({ ...selectedMessage, processingStatus: updated.processingStatus });
      }
      if (newStatus === 'READ' && unreadCount > 0) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  WhatsApp Inbound Messages Inbox
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Incoming candidate replies and interactive responses received via WhatsApp Cloud API
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadMessages}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name or phone..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['', 'UNREAD', 'READ', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inbox Layout: Message List + Thread / Details View */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Inbound Messages</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            When candidates reply to your official WhatsApp Cloud API templates, their responses will automatically appear in this inbox.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Messages List */}
          <div className="lg:col-span-5 space-y-2.5">
            {messages.map((msg) => {
              const isSelected = selectedMessage?._id === msg._id;
              const isUnread = msg.processingStatus === 'UNREAD';

              return (
                <div
                  key={msg._id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (isUnread) {
                      handleMarkStatus(msg._id, 'READ');
                    }
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-300 shadow-xs'
                      : isUnread
                      ? 'bg-white border-teal-200 shadow-xs ring-1 ring-teal-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {msg.senderName || msg.senderPhoneNumber}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-0.5 font-mono">
                    {msg.senderPhoneNumber}
                  </div>

                  <p className="text-xs text-slate-700 mt-2 line-clamp-2 leading-relaxed font-sans">
                    {msg.textBody || `[${msg.messageType} message]`}
                  </p>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    {msg.isOptOutRequest ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        <ShieldAlert className="w-3 h-3" /> Opt-Out (STOP)
                      </span>
                    ) : msg.linkedCandidateId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        <User className="w-3 h-3" /> Candidate Match
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Unknown Contact</span>
                    )}

                    <span className="text-[10px] text-slate-400 ml-auto uppercase font-medium">
                      {msg.processingStatus}
                    </span>
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-200 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Message Details Pane */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-6">
            {selectedMessage ? (
              <>
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedMessage.senderName || selectedMessage.senderPhoneNumber}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {selectedMessage.senderPhoneNumber}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />{' '}
                        {new Date(selectedMessage.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedMessage.processingStatus !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleMarkStatus(selectedMessage._id, 'RESOLVED')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {/* Opt-out Warning Banner */}
                {selectedMessage.isOptOutRequest && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <div className="text-xs">
                      <strong className="block font-bold">Automatic Opt-Out Enforced</strong>
                      Candidate replied with STOP / unsubscribe. This phone number has been automatically registered in the WhatsApp Suppression List and consent was revoked.
                    </div>
                  </div>
                )}

                {/* WhatsApp Chat Bubble Display */}
                <div className="bg-[#EFEAE2] p-6 rounded-2xl border border-slate-200 min-h-[160px] flex items-start">
                  <div className="bg-white rounded-2xl rounded-tl-xs p-4 max-w-lg shadow-xs text-slate-900 text-sm space-y-1">
                    <div className="text-[11px] font-bold text-teal-700">
                      {selectedMessage.senderName || selectedMessage.senderPhoneNumber}
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-sm text-slate-800">
                      {selectedMessage.textBody || `[${selectedMessage.messageType} attachment]`}
                    </p>
                    <div className="text-[10px] text-slate-400 text-right pt-1">
                      {new Date(selectedMessage.receivedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Matched Candidate Profile Card */}
                {selectedMessage.linkedCandidateId ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" /> Matched Placement Candidate
                      </span>
                      <Link
                        to={`/candidates/${selectedMessage.linkedCandidateId._id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        View Full Profile <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 block">Full Name</span>
                        <span className="font-bold text-slate-800">
                          {selectedMessage.linkedCandidateId.fullName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Placement Status</span>
                        <span className="font-semibold text-slate-800">
                          {selectedMessage.linkedCandidateId.placementStatus || 'Available'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">College</span>
                        <span className="font-medium text-slate-700">
                          {selectedMessage.linkedCandidateId.collegeName || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Email</span>
                        <span className="font-medium text-slate-700">
                          {selectedMessage.linkedCandidateId.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    No matching candidate profile found in database for {selectedMessage.senderPhoneNumber}.
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">
                Select a message from the inbox to read and inspect.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
