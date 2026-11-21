import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getGroups } from '../../services/groupService';
import { getRecipientReadiness } from '../../services/contactFetcherService';
import { VirtualGroup, RecipientReadinessData } from '../../types';
import { Badge } from '../common/Badge';

export const RecipientReadinessTab: React.FC = () => {
  const [groups, setGroups] = useState<VirtualGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [readinessData, setReadinessData] = useState<RecipientReadinessData | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab: 'ready' | 'blocked'
  const [activeTab, setActiveTab] = useState<'ready' | 'blocked'>('ready');

  useEffect(() => {
    setLoadingGroups(true);
    getGroups({ limit: 100 })
      .then((res) => {
        setGroups(res.groups || []);
        if (res.groups && res.groups.length > 0) {
          setSelectedGroupId(res.groups[0]._id);
        }
      })
      .finally(() => setLoadingGroups(false));
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoadingReadiness(true);
    setError(null);
    getRecipientReadiness(selectedGroupId)
      .then((res) => {
        setReadinessData(res);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to resolve recipient readiness');
      })
      .finally(() => setLoadingReadiness(false));
  }, [selectedGroupId]);

  return (
    <div className="space-y-6">
      {/* Group Selector Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              WhatsApp Recipient Integration Readiness Resolver
            </h3>
            <p className="text-xs text-slate-500">
              Audit and isolate WhatsApp broadcast audiences before dispatch. Evaluates consent records and E.164 normalization.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Module 7 WhatsApp Preparation
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Select Virtual Group to Audit *
          </label>
          {loadingGroups ? (
            <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading virtual groups...
            </div>
          ) : (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
            >
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.groupName} ({g.groupId}) — {g.companyId?.companyName} • {g.memberCount} members
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Audit Readiness Dashboard */}
      {loadingReadiness ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Resolving recipient readiness & consent status...</p>
        </div>
      ) : readinessData ? (
        <div className="space-y-4">
          {/* Readiness Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                Total Active Members
              </span>
              <span className="text-2xl font-bold text-slate-900">
                {readinessData.totalActiveMembers}
              </span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-emerald-700 block">
                Broadcast Ready (Eligible)
              </span>
              <span className="text-2xl font-bold text-emerald-800">
                {readinessData.messagingReadyCount}
              </span>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-amber-700 block">
                Blocked: No Consent
              </span>
              <span className="text-2xl font-bold text-amber-800">
                {readinessData.withoutConsentCount}
              </span>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-rose-700 block">
                Blocked: Malformed / Inactive
              </span>
              <span className="text-2xl font-bold text-rose-800">
                {readinessData.invalidPhoneCount + readinessData.inactiveCandidateCount}
              </span>
            </div>
          </div>

          {/* Audience Breakdown Tables */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 px-4 pt-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'ready'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Messaging-Ready Audience ({readinessData.messagingReadyCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blocked')}
                className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'blocked'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Excluded / Blocked Candidates ({readinessData.blockedRecipients.length})
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'ready' ? (
                readinessData.readyRecipients.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No group members currently meet all WhatsApp messaging eligibility requirements (valid E.164 phone + recorded consent).
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Candidate ID</th>
                          <th className="py-2.5 px-3">Full Name</th>
                          <th className="py-2.5 px-3">E.164 Number</th>
                          <th className="py-2.5 px-3">Consent Source</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {readinessData.readyRecipients.map((cand) => (
                          <tr key={cand.candidateId} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                              {cand.candidateId}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{cand.fullName}</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-800 font-semibold">
                              {cand.normalizedPhoneNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{cand.consentSource}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="success">Ready for Broadcast</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : readinessData.blockedRecipients.length === 0 ? (
                <p className="text-xs text-emerald-700 italic text-center py-6">
                  Great! 100% of candidates in this group are eligible and ready for WhatsApp messaging.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Candidate ID</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Blocking Reason</th>
                        <th className="py-2.5 px-3">Action Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {readinessData.blockedRecipients.map((cand) => (
                        <tr key={cand.candidateId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                            {cand.candidateId}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{cand.fullName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{cand.phoneNumber}</td>
                          <td className="py-2.5 px-3 text-rose-600 font-medium">{cand.reason}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {cand.reason.includes('consent')
                              ? 'Obtain WhatsApp Opt-in'
                              : cand.reason.includes('Inactive')
                              ? 'Reactivate Candidate'
                              : 'Update to E.164 Phone'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
