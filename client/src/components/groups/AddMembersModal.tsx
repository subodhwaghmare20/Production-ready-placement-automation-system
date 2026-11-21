import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react';
import {
  getEligibleCandidates,
  getAvailableCandidates,
  addGroupMembers,
} from '../../services/groupService';
import { Candidate, CandidateEligibilityItem } from '../../types';

interface AddMembersModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  groupId,
  groupName,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'search'>('suggestions');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<CandidateEligibilityItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Search state
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setError(null);
      // Load suggestions
      setLoadingSuggestions(true);
      getEligibleCandidates(groupId)
        .then((res) => {
          setSuggestions(res.evaluations);
          setLoadingSuggestions(false);
        })
        .catch(() => setLoadingSuggestions(false));

      // Load search list
      loadAvailableList();
    }
  }, [isOpen, groupId]);

  const loadAvailableList = () => {
    setLoadingCandidates(true);
    getAvailableCandidates(groupId, { search, branch, limit: 50 })
      .then((res) => {
        setAvailableCandidates(res.candidates);
        setLoadingCandidates(false);
      })
      .catch(() => setLoadingCandidates(false));
  };

  if (!isOpen) return null;

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAllSuggestions = () => {
    const eligibleIds = suggestions.filter((s) => s.isEligible).map((s) => s.candidate._id);
    setSelectedIds(Array.from(new Set([...selectedIds, ...eligibleIds])));
  };

  const handleAddSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await addGroupMembers(groupId, selectedIds);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Candidates to Group</h3>
              <p className="text-xs text-slate-500 font-mono">{groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex items-center justify-between border-b border-slate-200 mt-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'suggestions'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Automated Match Suggestions ({suggestions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'search'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Browse All Available</span>
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-700 pb-2">
            {selectedIds.length} candidate(s) selected
          </span>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          {activeTab === 'suggestions' ? (
            loadingSuggestions ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                All candidates are already members of this group or none match requirements.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="text-slate-500">
                    Showing candidates evaluated against company criteria
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllSuggestions}
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    Select All Matching
                  </button>
                </div>

                <div className="space-y-2">
                  {suggestions.map((item) => {
                    const isSelected = selectedIds.includes(item.candidate._id);
                    return (
                      <div
                        key={item.candidate._id}
                        onClick={() => handleToggleSelect(item.candidate._id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                            />
                            <div>
                              <span className="font-bold text-slate-900">
                                {item.candidate.fullName}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px] ml-2">
                                {item.candidate.candidateId}
                              </span>
                              <span className="text-slate-500 text-[11px] ml-2">
                                • {item.candidate.branch || 'Branch N/A'} • Batch {item.candidate.passingYear || 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.isEligible ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Criteria Matched ({item.matchScore}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Partial Match ({item.matchScore}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Breakdown badges */}
                        <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap gap-2 pl-6">
                          <span>Degree: {item.criteriaBreakdown.degree.reason}</span>
                          <span>•</span>
                          <span>Branch: {item.criteriaBreakdown.branch.reason}</span>
                          <span>•</span>
                          <span>Skills: {item.criteriaBreakdown.skills.reason}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadAvailableList()}
                    placeholder="Search candidate name or ID..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Filter by branch..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={loadAvailableList}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {loadingCandidates ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                </div>
              ) : availableCandidates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No candidates found matching filter criteria.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5 w-10">Select</th>
                        <th className="p-2.5">Candidate Name</th>
                        <th className="p-2.5">Branch</th>
                        <th className="p-2.5">Batch</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {availableCandidates.map((c) => {
                        const isSelected = selectedIds.includes(c._id);
                        return (
                          <tr
                            key={c._id}
                            onClick={() => handleToggleSelect(c._id)}
                            className={`cursor-pointer ${
                              isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                              />
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900">
                              {c.fullName}{' '}
                              <span className="font-mono text-slate-400 font-normal">
                                ({c.candidateId})
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600">{c.branch || '—'}</td>
                            <td className="p-2.5 text-slate-600">{c.passingYear || '—'}</td>
                            <td className="p-2.5 text-slate-700">{c.placementStatus}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Selected: <span className="font-bold text-slate-900">{selectedIds.length}</span>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedIds.length === 0 || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Assign {selectedIds.length} Candidates</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
