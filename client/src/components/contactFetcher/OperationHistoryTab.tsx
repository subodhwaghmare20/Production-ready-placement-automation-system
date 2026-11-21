import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Database,
  ClipboardPaste,
  AlertCircle,
} from 'lucide-react';
import { getFetchHistory, downloadReportUrl } from '../../services/contactFetcherService';
import { FetchOperationHistoryItem } from '../../types';
import { Badge } from '../common/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const OperationHistoryTab: React.FC = () => {
  const [history, setHistory] = useState<FetchOperationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter by source type
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');

  const fetchHistoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFetchHistory({
        page,
        limit,
        sourceType: sourceTypeFilter,
      });
      setHistory(res.history);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load operation history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sourceTypeFilter]);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'EXCEL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <FileSpreadsheet className="w-3 h-3" />
            Excel
          </span>
        );
      case 'CSV':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
            <FileSpreadsheet className="w-3 h-3" />
            CSV
          </span>
        );
      case 'DATABASE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
            <Database className="w-3 h-3" />
            DB Search
          </span>
        );
      case 'MANUAL_PASTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
            <ClipboardPaste className="w-3 h-3" />
            Manual Paste
          </span>
        );
      default:
        return <Badge variant="default">{source}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            Contact Fetch & Assignment Operation Logs
          </h3>
          <p className="text-xs text-slate-500">
            Complete audit history of candidate ingestion and virtual group allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sourceTypeFilter}
            onChange={(e) => {
              setSourceTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Source Channels</option>
            <option value="EXCEL">Excel Uploads</option>
            <option value="CSV">CSV Uploads</option>
            <option value="DATABASE">Candidate Database</option>
            <option value="MANUAL_PASTE">Manual Paste</option>
          </select>

          <button
            onClick={fetchHistoryData}
            title="Refresh history"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-xs text-red-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : loading && history.length === 0 ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="md" label="Loading operation history..." />
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No contact fetch or assignment operations recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Operation ID</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Target Virtual Group & Company</th>
                  <th className="py-2.5 px-3">Processed</th>
                  <th className="py-2.5 px-3">Assigned</th>
                  <th className="py-2.5 px-3">Already in Group</th>
                  <th className="py-2.5 px-3">Pending Consent</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {item.operationId}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">{getSourceBadge(item.sourceType)}</td>

                    <td className="py-2.5 px-3">
                      {item.groupName ? (
                        <div>
                          <span className="font-semibold text-slate-900 block">{item.groupName}</span>
                          <span className="text-[11px] text-slate-400">{item.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No group attached</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {item.totalProcessed} records
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        +{item.successfulAssignments} assigned
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {item.alreadyAssigned} skipped
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {item.withoutConsent > 0 ? (
                        <span className="text-amber-700 font-medium">
                          {item.withoutConsent} no consent
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.adminName}</td>

                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <a
                        href={downloadReportUrl(item.operationId)}
                        target="_blank"
                        rel="noreferrer"
                        title="Download CSV Audit Report"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        CSV Report
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of{' '}
              {totalCount} operations
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
