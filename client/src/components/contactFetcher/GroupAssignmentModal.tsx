import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  CheckCircle2,
  Sparkles,
  Download,
  Loader2,
  AlertCircle,
  Building2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { getGroups } from '../../services/groupService';
import { matchCompany, assignCandidates, downloadReportUrl } from '../../services/contactFetcherService';
import {
  VirtualGroup,
  CompanyMatchingData,
  AssignmentResultData,
  FetchSourceType,
} from '../../types';
import { Badge } from '../common/Badge';

interface GroupAssignmentModalProps {
  isOpen: boolean;
  selectedCandidateIds: string[];
  sourceType: FetchSourceType;
  onClose: () => void;
  onSuccess: () => void;
}

export const GroupAssignmentModal: React.FC<GroupAssignmentModalProps> = ({
  isOpen,
  selectedCandidateIds,
  sourceType,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<VirtualGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Eligibility matching state
  const [matchingData, setMatchingData] = useState<CompanyMatchingData | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingTab, setMatchingTab] = useState<'eligible' | 'partial' | 'ineligible'>('eligible');

  // Smart rules override checkboxes
  const [allowPlaced, setAllowPlaced] = useState(false);
  const [allowInactive, setAllowInactive] = useState(false);

  // Execution state
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<AssignmentResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingGroups(true);
      setError(null);
      setAssignmentResult(null);
      setMatchingData(null);
      setAllowPlaced(false);
      setAllowInactive(false);

      getGroups({ limit: 100 })
        .then((res) => {
          setGroups(res.groups || []);
          if (res.groups && res.groups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(res.groups[0]._id);
          }
        })
        .finally(() => setLoadingGroups(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g._id === selectedGroupId) || null;

  const handleRunMatch = async () => {
    if (!selectedGroupId || selectedCandidateIds.length === 0) return;
    try {
      setIsMatching(true);
      setError(null);
      const res = await matchCompany(selectedCandidateIds, selectedGroupId);
      setMatchingData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to match candidate requirements');
    } finally {
      setIsMatching(false);
    }
  };

  const handleExecuteAssignment = async () => {
    if (!selectedGroupId || selectedCandidateIds.length === 0) return;
    try {
      setIsAssigning(true);
      setError(null);
      const res = await assignCandidates({
        groupId: selectedGroupId,
        candidateIds: selectedCandidateIds,
        sourceType,
        allowPlaced,
        allowInactive,
      });
      setAssignmentResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign candidates');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Virtual Group Candidate Assignment</h3>
              <p className="text-xs text-slate-500">
                Assign {selectedCandidateIds.length} candidate(s) via Contact Fetcher ({sourceType})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* POST-OPERATION REPORT VIEW */}
        {assignmentResult ? (
          <div className="mt-5 space-y-5">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="text-sm font-bold">Candidate Assignment Executed Successfully</h4>
              </div>
              <p className="text-xs text-emerald-700 font-mono">
                Operation ID: {assignmentResult.operationId} • Group: {assignmentResult.groupName} (
                {assignmentResult.companyName})
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Newly Assigned
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {assignmentResult.newlyAssigned}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Reactivated
                </span>
                <span className="text-xl font-bold text-indigo-700">
                  {assignmentResult.reactivated}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Already in Group
                </span>
                <span className="text-xl font-bold text-slate-600">
                  {assignmentResult.alreadyAssigned}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Pending Consent
                </span>
                <span className="text-xl font-bold text-amber-600">
                  {assignmentResult.withoutConsentCount}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <a
                href={downloadReportUrl(assignmentResult.operationId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4" />
                Download Operation CSV Report
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/virtual-groups/${assignmentResult.groupId}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  View Virtual Group
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CONFIGURATION & EXECUTION VIEW */
          <div className="mt-4 space-y-5">
            {/* 1. Target Group Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Recruitment Virtual Group *
              </label>
              {loadingGroups ? (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading active virtual groups...
                </div>
              ) : groups.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No virtual recruitment groups available. Please create a virtual group in the Virtual Groups
                  module first.
                </div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setMatchingData(null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.groupName} ({g.groupId}) — {g.companyId?.companyName || 'Unknown Company'} •{' '}
                      {g.memberCount} active members
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target Group Details Card */}
            {selectedGroup && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedGroup.companyId?.companyName} — {selectedGroup.companyId?.jobRole}
                    </span>
                  </div>
                  <Badge variant={selectedGroup.status === 'Active' ? 'success' : 'default'}>
                    {selectedGroup.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                  <div>Active: {selectedGroup.memberCount}</div>
                  <div>Vacancies: {selectedGroup.companyId?.requiredCandidates || 'N/A'}</div>
                  <div>Drive: {selectedGroup.companyId?.companyId || 'N/A'}</div>
                </div>
              </div>
            )}

            {/* 2. Optional Company Criteria Matcher */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Automated Company Criteria Matching
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Evaluate selected candidates against degrees, branches, passing years, and skills required by{' '}
                    {selectedGroup?.companyId?.companyName}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunMatch}
                  disabled={isMatching || !selectedGroupId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isMatching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Evaluate Candidates
                </button>
              </div>

              {/* Categorization Results */}
              {matchingData && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2 border-b border-indigo-200/70 pb-2">
                    <button
                      type="button"
                      onClick={() => setMatchingTab('eligible')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        matchingTab === 'eligible'
                          ? 'bg-emerald-600 text-white'
                          : 'text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      A. Eligible ({matchingData.eligibleCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchingTab('partial')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        matchingTab === 'partial'
                          ? 'bg-amber-600 text-white'
                          : 'text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      B. Partially Matching ({matchingData.partiallyMatchingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchingTab('ineligible')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        matchingTab === 'ineligible'
                          ? 'bg-rose-600 text-white'
                          : 'text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      C. Not Eligible ({matchingData.notEligibleCount})
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {matchingTab === 'eligible' &&
                      (matchingData.candidates.eligible.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No candidates met 100% of the criteria.</p>
                      ) : (
                        matchingData.candidates.eligible.map((item) => (
                          <div
                            key={item.candidateId}
                            className="p-2 rounded bg-white border border-emerald-200 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800">
                              {item.candidate.fullName} ({item.candidateId})
                            </span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {item.matchScore}% Match
                            </span>
                          </div>
                        ))
                      ))}

                    {matchingTab === 'partial' &&
                      (matchingData.candidates.partiallyMatching.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No partially matching candidates.</p>
                      ) : (
                        matchingData.candidates.partiallyMatching.map((item) => (
                          <div
                            key={item.candidateId}
                            className="p-2 rounded bg-white border border-amber-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {item.candidate.fullName} ({item.candidateId})
                              </span>
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                {item.matchScore}% Match
                              </span>
                            </div>
                            {item.summaryReasons.uncertain.length > 0 && (
                              <p className="text-[11px] text-amber-700">
                                Uncertain: {item.summaryReasons.uncertain.join(', ')}
                              </p>
                            )}
                          </div>
                        ))
                      ))}

                    {matchingTab === 'ineligible' &&
                      (matchingData.candidates.notEligible.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hard-failing candidates.</p>
                      ) : (
                        matchingData.candidates.notEligible.map((item) => (
                          <div
                            key={item.candidateId}
                            className="p-2 rounded bg-white border border-rose-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {item.candidate.fullName} ({item.candidateId})
                              </span>
                              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                Ineligible
                              </span>
                            </div>
                            {item.summaryReasons.failing.length > 0 && (
                              <p className="text-[11px] text-rose-600">
                                Failing: {item.summaryReasons.failing.join(', ')}
                              </p>
                            )}
                          </div>
                        ))
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Smart Rules & Administrator Confirmation Overrides */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                Smart Assignment Rules & Safeguards
              </h4>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="allowPlacedCheckbox"
                    checked={allowPlaced}
                    onChange={(e) => setAllowPlaced(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allowPlacedCheckbox" className="cursor-pointer">
                    <span className="font-semibold text-slate-800">Allow assigning 'Placed' candidates</span>{' '}
                    (Candidates already placed will be assigned if checked; otherwise blocked with warning)
                  </label>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="allowInactiveCheckbox"
                    checked={allowInactive}
                    onChange={(e) => setAllowInactive(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allowInactiveCheckbox" className="cursor-pointer">
                    <span className="font-semibold text-slate-800">Allow assigning 'Inactive' candidates</span>{' '}
                    (Reactivates or permits inactive candidate profiles to be assigned)
                  </label>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Note: Candidates without WhatsApp consent can be assigned to the recruitment group, but will be
                  automatically flagged as ineligible for automated WhatsApp messaging broadcasts.
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isAssigning}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAssignment}
                disabled={isAssigning || !selectedGroupId || selectedCandidateIds.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {isAssigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Assign Candidates ({selectedCandidateIds.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
