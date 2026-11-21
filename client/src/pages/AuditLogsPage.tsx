import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  User,
  Activity,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { AuditLogData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'AUTH', label: 'Authentication & Session' },
  { value: 'ADMINS', label: 'Admin Management' },
  { value: 'ROLES', label: 'Roles & RBAC' },
  { value: 'CANDIDATES', label: 'Candidates' },
  { value: 'COMPANIES', label: 'Companies' },
  { value: 'GROUPS', label: 'Virtual Groups' },
  { value: 'WHATSAPP', label: 'WhatsApp Messaging' },
  { value: 'CAMPAIGNS', label: 'Campaigns & Analytics' },
  { value: 'TEMPLATES', label: 'Message Templates' },
  { value: 'SETTINGS', label: 'System Settings' },
  { value: 'SESSIONS', label: 'Session Management' },
];

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogData | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAuditLogs({
        page,
        limit,
        search: search.trim() || undefined,
        module: moduleFilter || undefined,
        outcome: outcomeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalRecords(res.pagination?.total || 0);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, moduleFilter, outcomeFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await adminService.exportAuditLogsCsv({
        search: search.trim() || undefined,
        module: moduleFilter || undefined,
        outcome: outcomeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setModuleFilter('');
    setOutcomeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getModuleBadgeColor = (mod: string) => {
    switch (mod) {
      case 'AUTH':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMINS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ROLES':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CANDIDATES':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPANIES':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'WHATSAPP':
      case 'CAMPAIGNS':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'SETTINGS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SESSIONS':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trail & Security Logs</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldAlert className="w-3 h-3" /> Append-Only
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, non-repudiable log of administrator activities, access grants, and system events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || logs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating CSV...' : 'Export to CSV'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Log Entries</p>
            <p className="text-xl font-bold text-slate-900">{totalRecords.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Successful Events</p>
            <p className="text-xl font-bold text-emerald-600">
              {logs.filter((l) => l.outcome === 'SUCCESS').length} <span className="text-xs text-slate-400 font-normal">in page</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Failed / Denied</p>
            <p className="text-xl font-bold text-rose-600">
              {logs.filter((l) => l.outcome === 'FAILURE').length} <span className="text-xs text-slate-400 font-normal">in page</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Modules Tracked</p>
            <p className="text-xl font-bold text-slate-900">11 Modules</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, actor name, email, target..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Module Selector */}
          <div className="w-full lg:w-48">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              {MODULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Selector */}
          <div className="w-full lg:w-36">
            <select
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILURE">Failure Only</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div className="w-full lg:w-40">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              title="Start Date"
            />
          </div>

          {/* Date Range End */}
          <div className="w-full lg:w-40">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              title="End Date"
            />
          </div>

          {(search || moduleFilter || outcomeFilter || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="font-medium">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Filter className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-base font-semibold text-slate-800">No audit log records found</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your search query or date range filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[760px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Administrator / Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4 text-center">Outcome</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id || log.auditId} className="hover:bg-slate-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-900">{log.actorName || 'System Process'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{log.actorEmail || 'system@internal'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {log.action}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getModuleBadgeColor(log.module)}`}>
                        {log.module}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.targetType ? (
                        <div className="text-xs">
                          <span className="text-slate-500 font-medium">{log.targetType}: </span>
                          <span className="text-slate-800 font-mono">{log.targetName || log.targetId || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Outcome */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {log.outcome === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Failure
                        </span>
                      )}
                    </td>

                    {/* Details Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-medium text-slate-700">{(page - 1) * limit + (logs.length > 0 ? 1 : 0)}</span> to{' '}
            <span className="font-medium text-slate-700">{Math.min(page * limit, totalRecords)}</span> of{' '}
            <span className="font-medium text-slate-700">{totalRecords.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900">Audit Log Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              {/* Key metadata grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Log Identifier</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-slate-800">{selectedLog.auditId || selectedLog._id}</span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.auditId || selectedLog._id)}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title="Copy ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Recorded At</span>
                  <span className="text-slate-800 mt-0.5 block font-mono">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Actor / Administrator</span>
                  <span className="text-slate-800 font-semibold mt-0.5 block">
                    {selectedLog.actorName} ({selectedLog.actorEmail})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Outcome Status</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${
                      selectedLog.outcome === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedLog.outcome}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Client IP Address</span>
                  <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Action & Module</span>
                  <span className="font-mono text-slate-800 mt-0.5 block">
                    {selectedLog.module} / {selectedLog.action}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium">User Agent</span>
                  <span className="font-mono text-slate-600 text-[11px] mt-0.5 block truncate">
                    {selectedLog.userAgent || 'Unknown User-Agent'}
                  </span>
                </div>
              </div>

              {/* Target Details */}
              {selectedLog.targetType && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
                  <span className="font-semibold text-blue-900">Target Resource:</span>{' '}
                  <span className="text-blue-800">
                    Type: <code className="bg-blue-100 px-1 py-0.5 rounded">{selectedLog.targetType}</code> | ID:{' '}
                    <code className="bg-blue-100 px-1 py-0.5 rounded">{selectedLog.targetId}</code> | Name:{' '}
                    <strong>{selectedLog.targetName || 'N/A'}</strong>
                  </span>
                </div>
              )}

              {/* Sanitized JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">Audit Payload & Metadata (Sanitized)</span>
                  <span className="text-[11px] text-slate-400">Tokens & passwords are masked with [REDACTED]</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto max-h-60">
                  <pre>{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
