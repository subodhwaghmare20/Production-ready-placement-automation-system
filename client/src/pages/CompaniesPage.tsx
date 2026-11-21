import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  FileCheck,
  Clock,
  Briefcase,
  AlertCircle,
  X,
  Users,
} from 'lucide-react';
import {
  getCompanies,
  getCompanyStats,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../services/companyService';
import { Company, CompanyStats, CompanyFilters } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { CompanyFormModal } from '../components/companies/CompanyFormModal';
import { DeleteCompanyModal } from '../components/companies/DeleteCompanyModal';
import { CompanyRequirementsModal } from '../components/companies/CompanyRequirementsModal';

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
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
  const [recruitmentStatus, setRecruitmentStatus] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [experienceType, setExperienceType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [companyToDelete, setCandidateToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [reqModalCompanyId, setReqModalCompanyId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await getCompanyStats();
      setStats(data);
    } catch {
      // Non-fatal
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: CompanyFilters = {
        page,
        limit,
        search,
        recruitmentStatus,
        jobLocation,
        experienceType,
        sortBy,
        sortOrder,
      };
      const data = await getCompanies(filters);
      setCompanies(data.companies);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, recruitmentStatus, jobLocation, experienceType, sortBy, sortOrder]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCompanies();
  };

  const handleClearFilters = () => {
    setSearch('');
    setRecruitmentStatus('');
    setJobLocation('');
    setExperienceType('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const handleCreateOrUpdate = async (data: Partial<Company>) => {
    try {
      setIsSaving(true);
      if (selectedCompany) {
        await updateCompany(selectedCompany._id, data);
      } else {
        await createCompany(data);
      }
      setIsFormModalOpen(false);
      setSelectedCompany(null);
      fetchCompanies();
      fetchStats();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCompany(companyToDelete._id);
      setCandidateToDelete(null);
      fetchCompanies();
      fetchStats();
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters =
    search || recruitmentStatus || jobLocation || experienceType || sortBy !== 'createdAt';

  return (
    <div className="space-y-6">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Company Recruitment Drives
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage visiting corporate partners, job profiles, eligibility criteria, and interview dates.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCompany(null);
            setIsFormModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company Drive</span>
        </button>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Companies"
          value={loadingStats ? '—' : stats?.totalCompanies ?? 0}
          subtitle="Registered visiting recruiters"
          icon={Building2}
        />
        <StatCard
          title="Active Drives"
          value={loadingStats ? '—' : stats?.activeCompanies ?? 0}
          subtitle="Hiring processes ongoing"
          icon={Briefcase}
          badge="Live"
        />
        <StatCard
          title="Drives On Hold"
          value={loadingStats ? '—' : stats?.onHoldCompanies ?? 0}
          subtitle="Temporary recruiter pause"
          icon={Clock}
        />
        <StatCard
          title="Total Vacancies"
          value={loadingStats ? '—' : stats?.totalRequiredCandidates ?? 0}
          subtitle="Aggregate openings available"
          icon={Users}
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
              placeholder="Search by company name, job role, location, ID, or HR name..."
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
                fetchCompanies();
                fetchStats();
              }}
              title="Refresh company list"
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
              <label className="block font-medium text-slate-600 mb-1">Recruitment Status</label>
              <select
                value={recruitmentStatus}
                onChange={(e) => {
                  setRecruitmentStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Job Location</label>
              <input
                type="text"
                value={jobLocation}
                onChange={(e) => {
                  setJobLocation(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Bangalore, Pune"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Experience Type</label>
              <select
                value={experienceType}
                onChange={(e) => {
                  setExperienceType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none bg-white"
              >
                <option value="">All Types</option>
                <option value="Fresher">Fresher</option>
                <option value="Experienced">Experienced</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Sort By</label>
              <div className="flex gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none bg-white text-xs"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="interviewDate">Interview Date</option>
                  <option value="companyName">Company Name</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 border border-slate-300 rounded-lg bg-slate-50 font-mono text-[10px]"
                >
                  {sortOrder.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={fetchCompanies} className="font-semibold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* Company Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg w-full" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Building2}
              title={hasActiveFilters ? 'No matching company drives found' : 'No company drives registered yet'}
              description={
                hasActiveFilters
                  ? 'Try clearing or modifying your filter parameters.'
                  : 'Register visiting recruiter profiles and job descriptions to begin drive coordination.'
              }
              actionText={hasActiveFilters ? 'Clear Filters' : 'Add Company Drive'}
              onAction={
                hasActiveFilters
                  ? handleClearFilters
                  : () => {
                      setSelectedCompany(null);
                      setIsFormModalOpen(true);
                    }
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Company Name</th>
                  <th className="py-3.5 px-4">Job Role</th>
                  <th className="py-3.5 px-4">Openings</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Salary Package</th>
                  <th className="py-3.5 px-4">Interview Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => {
                  const statusVariant =
                    c.recruitmentStatus === 'Active'
                      ? 'success'
                      : c.recruitmentStatus === 'On Hold'
                      ? 'warning'
                      : c.recruitmentStatus === 'Closed'
                      ? 'danger'
                      : 'info';

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <Link to={`/companies/${c._id}`} className="hover:underline flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>{c.companyName}</span>
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono block pl-4">
                          {c.companyId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {c.jobRole}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {c.requiredCandidates}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.jobLocation || 'Pan-India'}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                        {c.salaryPackage || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.interviewDate
                          ? new Date(c.interviewDate).toLocaleDateString()
                          : 'TBD'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant}>{c.recruitmentStatus}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setReqModalCompanyId(c._id)}
                            title="View Requirements Matrix"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/companies/${c._id}`}
                            title="View Profile"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedCompany(c);
                              setIsFormModalOpen(true);
                            }}
                            title="Edit Company"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCandidateToDelete(c)}
                            title="Delete Company"
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
        {companies.length > 0 && (
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
                Total {totalCount} company drives
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
      <CompanyFormModal
        isOpen={isFormModalOpen}
        company={selectedCompany}
        isSaving={isSaving}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedCompany(null);
        }}
        onSave={handleCreateOrUpdate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCompanyModal
        isOpen={Boolean(companyToDelete)}
        company={companyToDelete}
        isDeleting={isDeleting}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={handleDelete}
      />

      {/* Requirements Matrix Modal */}
      <CompanyRequirementsModal
        isOpen={Boolean(reqModalCompanyId)}
        companyId={reqModalCompanyId}
        onClose={() => setReqModalCompanyId(null)}
      />
    </div>
  );
};
