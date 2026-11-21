import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  Sparkles,
  AlertCircle,
  Search,
  Check,
  Loader2,
  Info,
  Layers,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { getCompanies } from '../services/companyService';
import { getCandidates } from '../services/candidateService';
import { getGroups, createGroup } from '../services/groupService';
import { Company, Candidate, VirtualGroup } from '../types';
import { Badge } from '../components/common/Badge';

export const CreateVirtualGroupPage: React.FC = () => {
  const navigate = useNavigate();

  // Data sources
  const [companies, setCompanies] = useState<Company[]>([]);
  const [existingGroups, setExistingGroups] = useState<VirtualGroup[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // UI state
  const [candidateTab, setCandidateTab] = useState<'suggestions' | 'all'>('suggestions');
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<false | boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        const [compRes, grpRes, candRes] = await Promise.all([
          getCompanies({ limit: 100 }),
          getGroups({ limit: 100 }),
          getCandidates({ limit: 200 }),
        ]);
        setCompanies(compRes.companies || []);
        setExistingGroups(grpRes.groups || []);
        setCandidates(candRes.candidates || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to initialize group creation form.');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, []);

  // Map company IDs that already have a group
  const companyGroupMap = useMemo(() => {
    const map = new Map<string, VirtualGroup>();
    existingGroups.forEach((g) => {
      if (g.companyId && g.companyId._id) {
        map.set(g.companyId._id, g);
      }
    });
    return map;
  }, [existingGroups]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c._id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // When company is selected, auto-fill group name and reset candidate selection
  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setError(null);
    const comp = companies.find((c) => c._id === companyId);
    if (comp) {
      setGroupName(`${comp.companyName} Recruitment`);
      setDescription(`Placement recruitment drive group for ${comp.companyName} (${comp.jobRole}).`);
    } else {
      setGroupName('');
      setDescription('');
    }
    setSelectedCandidateIds([]);
  };

  // Evaluate candidate suggestions based on selected company requirements
  const evaluatedSuggestions = useMemo(() => {
    if (!selectedCompany) return [];

    return candidates.map((cand) => {
      let score = 0;
      let totalCriteria = 0;
      const breakdown: { title: string; matched: boolean; detail: string }[] = [];

      // Degree check
      if (selectedCompany.eligibleDegrees && selectedCompany.eligibleDegrees.length > 0) {
        totalCriteria++;
        const matched = cand.degree ? selectedCompany.eligibleDegrees.includes(cand.degree) : false;
        if (matched) score += 20;
        breakdown.push({
          title: 'Degree',
          matched,
          detail: cand.degree ? `${cand.degree} (${matched ? 'Eligible' : 'Not listed'})` : 'Not specified',
        });
      }

      // Branch check
      if (selectedCompany.eligibleBranches && selectedCompany.eligibleBranches.length > 0) {
        totalCriteria++;
        const matched = cand.branch ? selectedCompany.eligibleBranches.includes(cand.branch) : false;
        if (matched) score += 25;
        breakdown.push({
          title: 'Branch',
          matched,
          detail: cand.branch ? `${cand.branch} (${matched ? 'Eligible' : 'Not listed'})` : 'Not specified',
        });
      }

      // Passing Year
      if (selectedCompany.eligiblePassingYears && selectedCompany.eligiblePassingYears.length > 0) {
        totalCriteria++;
        const matched = cand.passingYear
          ? selectedCompany.eligiblePassingYears.includes(cand.passingYear)
          : false;
        if (matched) score += 20;
        breakdown.push({
          title: 'Passing Year',
          matched,
          detail: cand.passingYear ? `${cand.passingYear}` : 'Not specified',
        });
      }

      // Experience Type
      if (selectedCompany.experienceType) {
        totalCriteria++;
        const matched = cand.experienceType === selectedCompany.experienceType;
        if (matched) score += 15;
        breakdown.push({
          title: 'Experience Type',
          matched,
          detail: `${cand.experienceType} vs Required ${selectedCompany.experienceType}`,
        });
      }

      // Skills check
      if (selectedCompany.requiredSkills && selectedCompany.requiredSkills.length > 0) {
        totalCriteria++;
        const reqSkills = selectedCompany.requiredSkills.map((s) => s.toLowerCase().trim());
        const candSkills = (cand.skills || []).map((s) => s.toLowerCase().trim());
        const matching = candSkills.filter((s) => reqSkills.includes(s));
        const skillMatchRatio = reqSkills.length > 0 ? matching.length / reqSkills.length : 0;
        const skillScore = Math.round(skillMatchRatio * 20);
        score += skillScore;
        breakdown.push({
          title: 'Skills',
          matched: matching.length > 0,
          detail: `${matching.length} of ${reqSkills.length} required skills matched`,
        });
      }

      const normalizedScore = totalCriteria > 0 ? Math.min(100, Math.round(score)) : 100;
      const isEligible = normalizedScore >= 50;

      return {
        candidate: cand,
        score: normalizedScore,
        isEligible,
        breakdown,
      };
    })
    .filter((item) => item.score > 20)
    .sort((a, b) => b.score - a.score);
  }, [selectedCompany, candidates]);

  // Filtered candidate list for browse tab
  const filteredAllCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates;
    const q = candidateSearch.toLowerCase();
    return candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.candidateId.toLowerCase().includes(q) ||
        (c.branch && c.branch.toLowerCase().includes(q)) ||
        (c.skills && c.skills.some((s) => s.toLowerCase().includes(q)))
    );
  }, [candidates, candidateSearch]);

  const toggleCandidate = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllEligible = () => {
    const eligibleIds = evaluatedSuggestions
      .filter((s) => s.isEligible)
      .map((s) => s.candidate._id);
    setSelectedCandidateIds(Array.from(new Set([...selectedCandidateIds, ...eligibleIds])));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      setError('Please select a company for this virtual group.');
      return;
    }
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }

    // Check if company already has a group
    if (companyGroupMap.has(selectedCompanyId)) {
      const g = companyGroupMap.get(selectedCompanyId)!;
      setError(
        `Selected company already has a primary virtual group (${g.groupId} - ${g.groupName}). A company may have only one primary group.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newGroup = await createGroup({
        companyId: selectedCompanyId,
        groupName: groupName.trim(),
        description: description.trim(),
        candidateIds: selectedCandidateIds,
      });

      navigate(`/virtual-groups/${newGroup._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create virtual group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading recruitment data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/virtual-groups"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Virtual Group
          </h1>
          <p className="text-sm text-slate-500">
            Establish a company recruitment cluster and assign matching candidates.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Step 1: Select Company */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-indigo-700">
              <Building2 className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900">1. Select Recruitment Company</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 1 of 3
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Target Company *
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanySelect(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              required
            >
              <option value="">-- Choose a company drive --</option>
              {companies.map((c) => {
                const hasGroup = companyGroupMap.has(c._id);
                return (
                  <option
                    key={c._id}
                    value={c._id}
                    disabled={hasGroup}
                    className={hasGroup ? 'text-slate-400 bg-slate-50' : 'text-slate-800'}
                  >
                    {c.companyName} — {c.jobRole} ({c.recruitmentStatus})
                    {hasGroup ? ' [Primary Group Already Exists]' : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Each company may have one primary virtual group in this system version.
            </p>
          </div>

          {selectedCompany && (
            <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-3 mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950">
                    {selectedCompany.companyName} — {selectedCompany.jobRole}
                  </h3>
                  <p className="text-xs text-indigo-700 font-mono">
                    ID: {selectedCompany.companyId} • Req: {selectedCompany.requiredCandidates} candidates
                  </p>
                </div>
                <Badge variant="info">{selectedCompany.recruitmentStatus}</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-indigo-100">
                <div>
                  <span className="text-slate-500 block font-medium">Eligible Degrees</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCompany.eligibleDegrees?.length ? selectedCompany.eligibleDegrees.join(', ') : 'Any'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Eligible Branches</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCompany.eligibleBranches?.length ? selectedCompany.eligibleBranches.join(', ') : 'Any'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Passing Years</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCompany.eligiblePassingYears?.length
                      ? selectedCompany.eligiblePassingYears.join(', ')
                      : 'Any'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Experience Type</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCompany.experienceType || 'Fresher'}
                  </span>
                </div>
              </div>

              {selectedCompany.requiredSkills && selectedCompany.requiredSkills.length > 0 && (
                <div className="pt-2 border-t border-indigo-100 text-xs">
                  <span className="text-slate-500 font-medium block mb-1">Required Skills:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCompany.requiredSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white text-indigo-800 border border-indigo-200 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Group Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-indigo-700">
              <Layers className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900">2. Virtual Group Details</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 2 of 3
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Infosys Recruitment 2026"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this recruitment batch, interview cycle, or audience..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Candidate Assignment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-indigo-700">
              <Users className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900">3. Initial Candidate Assignment</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                {selectedCandidateIds.length} Candidates Selected
              </span>
            </div>
          </div>

          {!selectedCompany ? (
            <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
              Please select a company in Step 1 to load candidate criteria suggestions.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCandidateTab('suggestions')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      candidateTab === 'suggestions'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Automated Suggestions ({evaluatedSuggestions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateTab('all')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      candidateTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Browse All Candidates ({candidates.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {candidateTab === 'suggestions' && evaluatedSuggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllEligible}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                    >
                      Select All Eligible ({evaluatedSuggestions.filter((s) => s.isEligible).length})
                    </button>
                  )}
                  {selectedCandidateIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCandidateIds([])}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestions Tab */}
              {candidateTab === 'suggestions' ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {evaluatedSuggestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No automated candidate suggestions matched the degree/branch criteria for this company.
                      You can browse all candidates in the next tab.
                    </div>
                  ) : (
                    evaluatedSuggestions.map((item) => {
                      const cand = item.candidate;
                      const isSelected = selectedCandidateIds.includes(cand._id);
                      return (
                        <div
                          key={cand._id}
                          onClick={() => toggleCandidate(cand._id)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900">
                                  {cand.fullName}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {cand.candidateId}
                                </span>
                                <Badge variant={cand.placementStatus === 'Available' ? 'success' : 'default'}>
                                  {cand.placementStatus}
                                </Badge>
                                {cand.whatsappConsent && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                                    WhatsApp Consented
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {cand.degree} • {cand.branch} • Batch {cand.passingYear} • {cand.collegeName || 'N/A'}
                              </p>
                              {cand.skills && cand.skills.length > 0 && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Skills: {cand.skills.slice(0, 5).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="inline-flex items-center gap-1">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  item.score >= 70
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.score >= 50
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.score}% Match
                              </span>
                            </div>
                            <span className="block text-[11px] text-slate-400 mt-1">
                              {item.isEligible ? 'Criteria Met' : 'Partial Match'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Browse All Tab */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      placeholder="Search candidates by name, ID, branch, or skills..."
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredAllCandidates.map((cand) => {
                      const isSelected = selectedCandidateIds.includes(cand._id);
                      return (
                        <div
                          key={cand._id}
                          onClick={() => toggleCandidate(cand._id)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-900">
                                  {cand.fullName}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {cand.candidateId}
                                </span>
                                <Badge variant={cand.placementStatus === 'Available' ? 'success' : 'default'}>
                                  {cand.placementStatus}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {cand.degree} • {cand.branch} • Batch {cand.passingYear}
                              </p>
                            </div>
                          </div>

                          <div className="text-right text-xs text-slate-500">
                            {cand.phoneNumber}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/virtual-groups"
            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !selectedCompanyId}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Virtual Group ({selectedCandidateIds.length} Members)
          </button>
        </div>
      </form>
    </div>
  );
};
