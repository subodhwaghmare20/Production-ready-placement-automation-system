import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Building2,
  Calendar,
  AlertTriangle,
  UserX,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ReportsPage: React.FC = () => {
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [unmaskPhone, setUnmaskPhone] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleDownload = async (
    reportType:
      | 'campaign-summary'
      | 'recipient-details'
      | 'company-performance'
      | 'monthly-activity'
      | 'failed-skipped',
    format: 'xlsx' | 'csv' | 'pdf'
  ) => {
    const key = `${reportType}-${format}`;
    try {
      setDownloadingType(key);
      setDownloadSuccess(null);
      await analyticsService.downloadReport(reportType, format, {
        unmaskPhone,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setDownloadSuccess(`Successfully exported ${reportType.replace('-', ' ')} as .${format.toUpperCase()}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to download report:', err);
      alert(err.message || 'Failed to generate report. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const reportsList = [
    {
      id: 'campaign-summary' as const,
      title: 'Campaign Summary & Outreach Audit Report',
      icon: FileSpreadsheet,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description:
        'Comprehensive overview of all recruitment drives, virtual group audiences, eligible recipients, confirmed sends, skip rates, and completion percentages.',
      columns: ['Campaign Name', 'Target Company', 'Virtual Group', 'Status', 'Total/Eligible', 'Confirmed', 'Skipped', 'Created By'],
    },
    {
      id: 'recipient-details' as const,
      title: 'Recipient-Wise Messaging Audit Report',
      icon: Users,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description:
        'Individual candidate-level messaging log with dispatch timestamps, administrator actions, retry histories, and masked phone numbers.',
      columns: ['Candidate Name & ID', 'Company', 'Phone (Masked)', 'WhatsApp Status', 'Validation', 'Last Action Date', 'Actor'],
    },
    {
      id: 'company-performance' as const,
      title: 'Company Recruitment & Performance Report',
      icon: Building2,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description:
        'Aggregated placement outreach performance metrics grouped by hiring companies, candidate pools, and completion rates.',
      columns: ['Company Name', 'Industry', 'Total Campaigns', 'Candidate Volume', 'Confirmed Sends', 'Completion Rate %'],
    },
    {
      id: 'monthly-activity' as const,
      title: 'Monthly Outreach Activity Report',
      icon: Calendar,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description:
        'Month-by-month historical trend analysis of campaign creation, candidate volumes, and administrative confirmations.',
      columns: ['Month (YYYY-MM)', 'Campaigns Created', 'Completed', 'Recipients Handled', 'Confirmed Sends', 'Skipped'],
    },
    {
      id: 'failed-skipped' as const,
      title: 'Failed & Skipped Recipients Report',
      icon: UserX,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      description:
        'Audit list of candidates who could not be messaged due to chat opening failures, unresponsiveness, or manual skips.',
      columns: ['Candidate Name', 'Company', 'Status', 'Skip Reason / Error Details', 'Attempt Count', 'Last Attempt Date'],
    },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reports & Audit Exports
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Module 9
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Generate and export official placement audit reports in Excel (.xlsx), CSV, or formatted PDF.
          </p>
        </div>

        {/* Global Security / Phone Reveal Toggle & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 focus:outline-hidden font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT_MANUALLY_CONFIRMED">Confirmed Sent</option>
              <option value="SKIPPED">Skipped Only</option>
              <option value="FAILED_TO_OPEN">Failed Only</option>
            </select>
          </div>

          <button
            onClick={() => setUnmaskPhone(!unmaskPhone)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-2xs ${
              unmaskPhone
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {unmaskPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{unmaskPhone ? 'Mask Numbers in Exports' : 'Unmask Phone Numbers (Admin)'}</span>
          </button>
        </div>
      </div>

      {/* Compliance / Personal Mode Notice */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-900">Compliance & Privacy Notice: </span>
          <span>
            Candidate phone numbers are masked by default in all exports to protect student privacy.
            WhatsApp delivery and read status cannot be independently verified in personal assisted mode; reports document administrator-confirmed dispatches.
          </span>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{downloadSuccess}</span>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportsList.map((rep) => (
          <div
            key={rep.id}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <rep.icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{rep.title}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border mt-1 ${rep.badgeColor}`}>
                      Official Audit
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{rep.description}</p>

              {/* Columns Included Chips */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Fields Included:
                </span>
                <div className="flex flex-wrap gap-1">
                  {rep.columns.map((col, cIdx) => (
                    <span
                      key={cIdx}
                      className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] border border-slate-200"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Download Buttons Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Export Format:</span>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Excel Button */}
                <button
                  onClick={() => handleDownload(rep.id, 'xlsx')}
                  disabled={downloadingType !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {downloadingType === `${rep.id}-xlsx` ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>Excel (.xlsx)</span>
                </button>

                {/* CSV Button */}
                <button
                  onClick={() => handleDownload(rep.id, 'csv')}
                  disabled={downloadingType !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {downloadingType === `${rep.id}-csv` ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-blue-700" />
                  )}
                  <span>CSV</span>
                </button>

                {/* PDF Button */}
                <button
                  onClick={() => handleDownload(rep.id, 'pdf')}
                  disabled={downloadingType !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
                >
                  {downloadingType === `${rep.id}-pdf` ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
