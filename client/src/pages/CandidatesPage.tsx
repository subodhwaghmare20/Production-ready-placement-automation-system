import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  MessageSquare,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import {
  getCandidates,
  getCandidateStats,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  exportCandidates,
} from '../services/candidateService';
import { Candidate, CandidateStats, CandidateFilters } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { CandidateFormModal } from '../components/candidates/CandidateFormModal';
import { BulkImportModal } from '../components/candidates/BulkImportModal';
import { DeleteConfirmModal } from '../components/candidates/DeleteConfirmModal';

export const CandidatesPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [placementStatus, setPlacementStatus] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState('');
  const [passingYear, setPassingYear] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await getCandidateStats();
      setStats(data);
    } catch {
      // Non-fatal
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: CandidateFilters = {
        page,
        limit,
        search,
        branch,
        placementStatus,
        whatsappConsent,
        passingYear,
      };
      const data = await getCandidates(filters);
      setCandidates(data.candidates);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, branch, placementStatus, whatsappConsent, passingYear]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  const handleClearFilters = () => {
    setSearch('');
    setBranch('');
    setPlacementStatus('');
    setWhatsappConsent('');
    setPassingYear('');
    setPage(1);
  };

  const handleCreateOrUpdate = async (candidateData: Partial<Candidate>) => {
    try {
      setIsSaving(true);
      if (selectedCandidate) {
        await updateCandidate(selectedCandidate._id, candidateData);
      } else {
        await createCandidate(candidateData);
      }
      setIsFormModalOpen(false);
      setSelectedCandidate(null);
      fetchCandidates();
      fetchStats();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!candidateToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCandidate(candidateToDelete._id);
      setCandidateToDelete(null);
      fetchCandidates();
      fetchStats();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      await exportCandidates(
        { search, branch, placementStatus, whatsappConsent, passingYear },
        format
      );
    } catch {
      setError('Export failed. Please try again.');
    }
  };

  const hasActiveFilters =
    search || branch || placementStatus || whatsappConsent || passingYear;

  return (
    <div className="space-y-6">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Candidate Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized student profiles, eligibility criteria, and WhatsApp messaging consent logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Export Dropdown / Buttons */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
            <button
              onClick={() => handleExport('xlsx')}
              title="Export filtered records to Excel"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <button
              onClick={() => handleExport('csv')}
              title="Export filtered records to CSV"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Bulk Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk Import</span>
          </button>

          {/* Add Candidate Button */}
          <button
            onClick={() => {
              setSelectedCandidate(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Candidates"
          value={loadingStats ? '—' : stats?.totalCandidates ?? 0}
          subtitle="Enrolled student profiles"
          icon={Users}
        />
        <StatCard
          title="Available for Drives"
          value={loadingStats ? '—' : stats?.availableCandidates ?? 0}
          subtitle="Eligible seeking employment"
          icon={Clock}
          badge="Active"
        />
        <StatCard
          title="Placed Candidates"
          value={loadingStats ? '—' : stats?.placedCandidates ?? 0}
          subtitle="Secured corporate placement"
          icon={Award}
        />
        <StatCard
          title="WhatsApp Consent"
          value={loadingStats ? '—' : stats?.whatsappConsentCount ?? 0}
          subtitle="Explicit opt-in recorded"
          icon={MessageSquare}
        />
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate name, ID, phone, email, or branch..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            />
          </form>

          {/* Filter toggle & Quick filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                hasActiveFilters
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            <button
              onClick={() => {
                fetchCandidates();
                fetchStats();
              }}
              title="Refresh table"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {isFilterPanelOpen && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Computer Science"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Placement Status</label>
              <select
                value={placementStatus}
                onChange={(e) => {
                  setPlacementStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Placed">Placed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">WhatsApp Consent</label>
              <select
                value={whatsappConsent}
                onChange={(e) => {
                  setWhatsappConsent(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="">All Candidates</option>
                <option value="true">Consent Granted</option>
                <option value="false">No Consent</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Passing Year</label>
              <input
                type="number"
                value={passingYear}
                onChange={(e) => {
                  setPassingYear(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. 2026"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCandidates}
            className="font-semibold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Candidate Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg w-full" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? 'No matching candidates found' : 'No candidates registered yet'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search keywords or filter criteria.'
                  : 'Start by adding an individual candidate or bulk-importing a class spreadsheet.'
              }
              actionText={hasActiveFilters ? 'Clear Filters' : 'Add Candidate'}
              onAction={
                hasActiveFilters
                  ? handleClearFilters
                  : () => {
                      setSelectedCandidate(null);
                      setIsFormModalOpen(true);
                    }
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Candidate ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Phone (Normalized)</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Batch</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">WhatsApp Consent</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => {
                  const statusVariant =
                    c.placementStatus === 'Placed'
                      ? 'success'
                      : c.placementStatus === 'Available'
                      ? 'info'
                      : 'default';

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {c.candidateId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <Link
                          to={`/candidates/${c._id}`}
                          className="hover:underline text-slate-900"
                        >
                          {c.fullName}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {c.normalizedPhoneNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{c.email || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {c.branch || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{c.passingYear || '—'}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant}>{c.placementStatus}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.whatsappConsent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Granted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            <XCircle className="w-3 h-3" /> No Consent
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/candidates/${c._id}`}
                            title="View Full Profile"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedCandidate(c);
                              setIsFormModalOpen(true);
                            }}
                            title="Edit Candidate"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCandidateToDelete(c)}
                            title="Delete Candidate"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {candidates.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none bg-white text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2 font-medium text-slate-700">
                Total {totalCount} candidates
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 text-xs font-semibold"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 text-xs font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <CandidateFormModal
        isOpen={isFormModalOpen}
        candidate={selectedCandidate}
        isSaving={isSaving}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedCandidate(null);
        }}
        onSave={handleCreateOrUpdate}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchCandidates();
          fetchStats();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(candidateToDelete)}
        candidate={candidateToDelete}
        isDeleting={isDeleting}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};
