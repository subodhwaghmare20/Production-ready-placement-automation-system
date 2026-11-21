import React, { useEffect, useState } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getRecipientResolution } from '../../services/groupService';
import { RecipientResolutionData } from '../../types';

interface RecipientResolutionModalProps {
  isOpen: boolean;
  groupId: string | null;
  onClose: () => void;
}

export const RecipientResolutionModal: React.FC<RecipientResolutionModalProps> = ({
  isOpen,
  groupId,
  onClose,
}) => {
  const [data, setData] = useState<RecipientResolutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'consent' | 'noConsent' | 'invalid'>('consent');

  useEffect(() => {
    if (isOpen && groupId) {
      setLoading(true);
      setError(null);
      getRecipientResolution(groupId)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to resolve recipients');
          setLoading(false);
        });
    }
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                WhatsApp Recipient Resolution Audit
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {data?.companyName} • {data?.groupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Compliance Banner */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">Pre-Broadcast Recipient Engine:</span>{' '}
            In accordance with Module 5 architectural boundaries, no WhatsApp messages are transmitted.
            This service resolves active group members and partitions them based on verified explicit consent.
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : error || !data ? (
          <div className="py-8 text-center text-xs text-rose-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error || 'No resolution data available'}</span>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Total Active Members
                </span>
                <p className="text-xl font-bold text-slate-900 mt-1">{data.totalActiveMembers}</p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Eligible Recipients
                </span>
                <p className="text-xl font-bold text-emerald-900 mt-1">
                  {data.totalEligibleRecipients}
                </p>
                <span className="text-[10px] text-emerald-700">Consent Verified</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Consent Required
                </span>
                <p className="text-xl font-bold text-amber-900 mt-1">
                  {data.candidatesWithoutConsent.length}
                </p>
                <span className="text-[10px] text-amber-700">Opt-in Not Granted</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('consent')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'consent'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Eligible with Consent ({data.candidatesWithConsent.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('noConsent')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'noConsent'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Without Consent ({data.candidatesWithoutConsent.length})
              </button>
              {data.invalidPhoneNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('invalid')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'invalid'
                      ? 'border-rose-600 text-rose-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Invalid Phone ({data.invalidPhoneNumbers.length})
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
              {activeTab === 'consent' && (
                data.candidatesWithConsent.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Candidate ID</th>
                        <th className="p-2.5">Full Name</th>
                        <th className="p-2.5">Normalized WhatsApp Number</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.candidatesWithConsent.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-700">{c.candidateId}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{c.fullName}</td>
                          <td className="p-2.5 font-mono text-emerald-700 font-medium">
                            {c.normalizedPhoneNumber}
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                              Eligible
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active candidates in this group have granted WhatsApp consent yet.
                  </div>
                )
              )}

              {activeTab === 'noConsent' && (
                data.candidatesWithoutConsent.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Candidate ID</th>
                        <th className="p-2.5">Full Name</th>
                        <th className="p-2.5">Phone Number</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.candidatesWithoutConsent.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-700">{c.candidateId}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{c.fullName}</td>
                          <td className="p-2.5 font-mono text-slate-600">{c.phoneNumber}</td>
                          <td className="p-2.5">
                            <span className="text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                              Blocked (No Consent)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-xs text-emerald-600">
                    All active group candidates have granted explicit WhatsApp consent.
                  </div>
                )
              )}

              {activeTab === 'invalid' && (
                <div className="p-4 space-y-2 text-xs">
                  {data.invalidPhoneNumbers.map((c) => (
                    <div key={c._id} className="p-2 bg-rose-50 rounded text-rose-800 flex justify-between">
                      <span>{c.fullName} ({c.candidateId})</span>
                      <span className="font-mono">{c.phoneNumber}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            Close Resolution
          </button>
        </div>
      </div>
    </div>
  );
};
