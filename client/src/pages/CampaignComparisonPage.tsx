import React, { useState, useEffect } from 'react';
import {
  Layers,
  AlertTriangle,
  Clock,
  RotateCcw,
  Building2,
  Check,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { campaignService } from '../services/campaignService';
import { CampaignComparisonItem, WhatsAppCampaign } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CampaignComparisonPage: React.FC = () => {
  const [allCampaigns, setAllCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<CampaignComparisonItem[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [comparing, setComparing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available campaigns for selection
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const res = await campaignService.getCampaigns({ limit: 50 });
        setAllCampaigns(res.campaigns);
        // Pre-select first 2 campaigns if available
        if (res.campaigns.length >= 2) {
          const initialIds = [res.campaigns[0]._id, res.campaigns[1]._id];
          setSelectedIds(initialIds);
          runComparison(initialIds);
        }
      } catch (err) {
        console.error('Failed to load campaigns list for comparison:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCampaigns();
  }, []);

  const runComparison = async (idsToCompare: string[]) => {
    if (idsToCompare.length < 2) {
      setError('Please select at least 2 campaigns to compare.');
      setComparisons([]);
      return;
    }
    try {
      setComparing(true);
      setError(null);
      const res = await analyticsService.compareCampaigns(idsToCompare);
      setComparisons(res.comparisons);
      setDisclaimer(res.disclaimer);
    } catch (err: any) {
      setError(err.message || 'Failed to compare campaigns');
    } finally {
      setComparing(false);
    }
  };

  const toggleSelectCampaign = (id: string) => {
    let updated: string[];
    if (selectedIds.includes(id)) {
      updated = selectedIds.filter((cid) => cid !== id);
    } else {
      if (selectedIds.length >= 5) {
        alert('You can compare a maximum of 5 campaigns at once.');
        return;
      }
      updated = [...selectedIds, id];
    }
    setSelectedIds(updated);
    if (updated.length >= 2) {
      runComparison(updated);
    } else {
      setComparisons([]);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Multi-Campaign Comparison
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare candidate volume, confirmed sends, skip rates, and completion duration across recruitment drives.
          </p>
        </div>

        {selectedIds.length >= 2 && (
          <button
            onClick={() => runComparison(selectedIds)}
            disabled={comparing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${comparing ? 'animate-spin' : ''}`} />
            Refresh Comparison
          </button>
        )}
      </div>

      {/* Mandatory Personal Mode Notice */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-900">Personal WhatsApp Mode: </span>
          <span>
            {disclaimer ||
              'Delivery and read status cannot be independently verified in personal assisted mode. Side-by-side comparison strictly compares confirmed dispatch counts, not verified delivery rates.'}
          </span>
        </div>
      </div>

      {/* Campaign Selection Drawer / Pills */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Select Campaigns to Compare ({selectedIds.length}/5 selected):
          </span>
          {selectedIds.length < 2 && (
            <span className="text-[11px] text-rose-500 font-medium">
              * Select at least 2 campaigns to generate comparison
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allCampaigns.map((c) => {
              const isSelected = selectedIds.includes(c._id);
              const comp = typeof c.companyId === 'object' ? c.companyId : null;

              return (
                <button
                  key={c._id}
                  onClick={() => toggleSelectCampaign(c._id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${
                      isSelected ? 'bg-white text-blue-600 border-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="font-semibold">{c.name}</span>
                  {comp && (
                    <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      ({comp.companyName})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
          {error}
        </div>
      )}

      {/* Side-by-Side Comparison Cards */}
      {comparisons.length >= 2 && (
        <div className="space-y-6">
          <div className={`grid grid-cols-1 md:grid-cols-${Math.min(comparisons.length, 4)} gap-4`}>
            {comparisons.map((item, idx) => (
              <div
                key={item.campaignId}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Campaign #{idx + 1}</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.campaignId}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {item.companyName}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Completion:</span>
                    <span className="font-bold text-slate-900 font-mono">{item.completionPercentage}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Metric Items */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                    <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                      {item.totalRecipients}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Eligible</span>
                    <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                      {item.eligibleRecipients}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold">Confirmed</span>
                    <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                      {item.manuallyConfirmedCount}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Skipped</span>
                    <p className="font-mono font-bold text-slate-700 text-sm mt-0.5">
                      {item.skippedCount}
                    </p>
                  </div>
                </div>

                {/* Duration & Status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item.durationFormatted}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Full Comparison Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Comparison Matrix Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase">
                    <th className="py-3 px-4">Metric / Dimension</th>
                    {comparisons.map((c) => (
                      <th key={c.campaignId} className="py-3 px-4">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Target Company</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 font-sans font-semibold text-slate-800">
                        {c.companyName}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Total Group Members</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 text-slate-700">
                        {c.totalRecipients}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Eligible Recipients</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 font-bold text-blue-600">
                        {c.eligibleRecipients}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Manually Confirmed Sends</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 font-bold text-emerald-600">
                        {c.manuallyConfirmedCount}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Skipped Candidates</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 text-slate-500">
                        {c.skippedCount}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Failed-to-Open Attempts</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 font-bold text-rose-600">
                        {c.failedCount}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Completion %</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 font-bold text-slate-900">
                        {c.completionPercentage}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Campaign Duration</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 text-slate-600">
                        {c.durationFormatted}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600">Verified Delivery Rate</td>
                    {comparisons.map((c) => (
                      <td key={c.campaignId} className="py-2.5 px-4 font-sans text-slate-400 italic text-[11px]">
                        N/A (Personal Assisted Mode)
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
