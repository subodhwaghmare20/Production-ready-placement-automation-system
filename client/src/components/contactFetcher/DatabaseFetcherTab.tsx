import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Users,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { searchCandidates } from '../../services/contactFetcherService';
import { Candidate } from '../../types';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface DatabaseFetcherTabProps {
  onAssignCandidates: (candidateIds: string[]) => void;
}

export const DatabaseFetcherTab: React.FC<DatabaseFetcherTabProps> = ({
  onAssignCandidates,
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [passingYear, setPassingYear] = useState('');
  const [skills, setSkills] = useState('');
  const [experienceType, setExperienceType] = useState('');
  const [placementStatus, setPlacementStatus] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchCandidatesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await searchCandidates({
        page,
        limit,
        search: searchTerm,
        college,
        degree,
        branch,
        passingYear,
        skills,
        experienceType,
        placementStatus,
        whatsappConsent,
      });
      setCandidates(res.candidates);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch candidate database records');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    searchTerm,
    college,
    degree,
    branch,
    passingYear,
    skills,
    experienceType,
    placementStatus,
    whatsappConsent,
  ]);

  useEffect(() => {
    fetchCandidatesData();
  }, [fetchCandidatesData]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllOnPage = () => {
    const pageIds = candidates.map((c) => c._id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCollege('');
    setDegree('');
    setBranch('');
    setPassingYear('');
    setSkills('');
    setExperienceType('');
    setPlacementStatus('');
    setWhatsappConsent('');
    setPage(1);
  };

  const activeFilterCount = [
    college,
    degree,
    branch,
    passingYear,
    skills,
    experienceType,
    placementStatus,
    whatsappConsent,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search database by candidate name, phone, email, candidate ID, or college..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={fetchCandidatesData}
              title="Refresh Records"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Multi-Criteria Filters Drawer */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Degree</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => {
                  setDegree(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. B.Tech, M.Tech"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Computer Science"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Passing Year</label>
              <input
                type="number"
                value={passingYear}
                onChange={(e) => {
                  setPassingYear(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. 2026"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Skills</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => {
                  setSkills(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. React, Node.js"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Experience Type</label>
              <select
                value={experienceType}
                onChange={(e) => {
                  setExperienceType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">All Types</option>
                <option value="Fresher">Fresher Only</option>
                <option value="Experienced">Experienced Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Placement Status</label>
              <select
                value={placementStatus}
                onChange={(e) => {
                  setPlacementStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Placed">Placed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">WhatsApp Consent</label>
              <select
                value={whatsappConsent}
                onChange={(e) => {
                  setWhatsappConsent(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">Any Consent Status</option>
                <option value="true">Consented Only</option>
                <option value="false">No Consent Recorded</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selection Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllOnPage}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Select / Deselect Page
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1"
            >
              Clear Selection
            </button>
          )}
          <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
            {selectedIds.length} candidate(s) selected
          </span>
        </div>

        <button
          onClick={() => onAssignCandidates(selectedIds)}
          disabled={selectedIds.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-40 transition-colors"
        >
          <Users className="w-4 h-4" />
          Assign Selected ({selectedIds.length}) to Virtual Group
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Candidate Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-xs text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : loading && candidates.length === 0 ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="md" label="Searching candidates database..." />
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No candidates matched the selected search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-2.5 px-3">Candidate ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Phone / E.164</th>
                  <th className="py-2.5 px-3">Degree & Branch</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Placement Status</th>
                  <th className="py-2.5 px-3">WhatsApp Consent</th>
                  <th className="py-2.5 px-3">College</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((cand) => {
                  const isChecked = selectedIds.includes(cand._id);
                  return (
                    <tr
                      key={cand._id}
                      onClick={() => toggleSelect(cand._id)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isChecked ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(cand._id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">
                        {cand.candidateId}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{cand.fullName}</span>
                        {cand.email && <span className="text-[11px] text-slate-400">{cand.email}</span>}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {cand.normalizedPhoneNumber || cand.phoneNumber}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800 block">{cand.branch || 'N/A'}</span>
                        <span className="text-slate-400 text-[11px]">{cand.degree || 'N/A'}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        {cand.passingYear || 'N/A'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge
                          variant={
                            cand.placementStatus === 'Available'
                              ? 'success'
                              : cand.placementStatus === 'Placed'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {cand.placementStatus}
                        </Badge>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {cand.whatsappConsent ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                            Consented
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">
                            No Consent
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {cand.collegeName || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of{' '}
              {totalCount} candidates
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1 font-medium">{page} / {totalPages || 1}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
