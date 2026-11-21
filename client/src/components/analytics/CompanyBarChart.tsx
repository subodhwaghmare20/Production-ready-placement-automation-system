import React from 'react';
import { CompanyPerformanceItem } from '../../types';

interface CompanyBarChartProps {
  data: CompanyPerformanceItem[];
}

export const CompanyBarChart: React.FC<CompanyBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200 py-12">
        No company performance data available for this range.
      </div>
    );
  }

  const topCompanies = data.slice(0, 6);
  const maxCandidates = Math.max(...topCompanies.map((c) => c.eligibleCandidates || c.totalCandidates || 1), 1);

  return (
    <div className="space-y-4">
      {topCompanies.map((comp) => {
        const eligible = comp.eligibleCandidates || comp.totalCandidates || 0;
        const confirmed = comp.confirmedSends || 0;
        const skipped = comp.skippedCandidates || 0;
        const failed = comp.failedAttempts || 0;

        const confirmedPct = eligible > 0 ? (confirmed / eligible) * 100 : 0;
        const skippedPct = eligible > 0 ? (skipped / eligible) * 100 : 0;
        const failedPct = eligible > 0 ? (failed / eligible) * 100 : 0;

        const totalWidthPct = (eligible / maxCandidates) * 100;

        return (
          <div key={comp.companyId} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
                  {comp.companyName}
                </span>
                {comp.industry && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                    {comp.industry}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-emerald-600 font-bold">{confirmed} sent</span>
                <span className="text-slate-400">/ {eligible} eligible</span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[10px]">
                  {comp.completionRate}%
                </span>
              </div>
            </div>

            {/* Segmented Bar */}
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full flex transition-all duration-500"
                style={{ width: `${Math.max(10, totalWidthPct)}%` }}
              >
                {/* Confirmed Send segment */}
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${confirmedPct}%` }}
                  title={`Confirmed Sent: ${confirmed}`}
                />
                {/* Skipped segment */}
                <div
                  className="h-full bg-slate-400 transition-all duration-300"
                  style={{ width: `${skippedPct}%` }}
                  title={`Skipped: ${skipped}`}
                />
                {/* Failed to open segment */}
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${failedPct}%` }}
                  title={`Failed Attempts: ${failed}`}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 pt-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
          <span>Confirmed Sent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
          <span>Skipped</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
          <span>Failed Attempts</span>
        </div>
      </div>
    </div>
  );
};
