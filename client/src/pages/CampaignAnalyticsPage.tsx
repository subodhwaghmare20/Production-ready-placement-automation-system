import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Send,
  UserCheck,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import {
  OverviewStats,
  CampaignTrendItem,
  RecipientStatusDistribution,
  CompanyPerformanceItem,
} from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LineTrendChart } from '../components/analytics/LineTrendChart';
import { DonutStatusChart } from '../components/analytics/DonutStatusChart';
import { CompanyBarChart } from '../components/analytics/CompanyBarChart';

export const CampaignAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [trends, setTrends] = useState<CampaignTrendItem[]>([]);
  const [statusDist, setStatusDist] = useState<RecipientStatusDistribution | null>(null);
  const [companyPerf, setCompanyPerf] = useState<CompanyPerformanceItem[]>([]);
  const [dateRange, setDateRange] = useState<string>('ALL');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let startDate: string | undefined;
      const now = new Date();

      if (dateRange === '7D') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      } else if (dateRange === '30D') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      } else if (dateRange === '90D') {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      }

      const [overviewData, trendsData, distData, compData] = await Promise.all([
        analyticsService.getOverview({ startDate }),
        analyticsService.getCampaignTrends({ interval: 'month', startDate }),
        analyticsService.getRecipientStatus({ startDate }),
        analyticsService.getCompanyPerformance({ startDate }),
      ]);

      setOverview(overviewData);
      setTrends(trendsData);
      setStatusDist(distData);
      setCompanyPerf(compData);
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Campaign Analytics & Tracking
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Personal WhatsApp Mode
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time campaign progress, recipient outreach tracking, and recruitment performance metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date range filter pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-white shadow-2xs">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: '90D', label: 'Last 90d' },
              { id: '30D', label: 'Last 30d' },
              { id: '7D', label: 'Last 7d' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  dateRange === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics()}
            title="Refresh Analytics"
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mandatory Personal WhatsApp Mode Disclaimer Banner */}
      <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 shadow-2xs text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-amber-800 space-y-1">
          <p className="font-semibold text-amber-900">
            Important Compliance Notice — Personal WhatsApp Assisted Mode
          </p>
          <p className="text-amber-700 leading-relaxed">
            WhatsApp delivery and read status cannot be independently verified in personal assisted mode.
            Messages marked as confirmed represent manual administrator action after dispatching via WhatsApp Web/Desktop.
            They are not represented as verified deliveries.
          </p>
        </div>
      </div>

      {loading && !overview ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Total Campaigns */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">Total Campaigns</span>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900">{overview?.totalCampaigns || 0}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="text-emerald-600 font-semibold">{overview?.completedCampaigns || 0}</span> done
                <span>•</span>
                <span className="text-blue-600 font-semibold">{overview?.activeCampaigns || 0}</span> active
              </div>
            </div>

            {/* Card 2: Total Recipients */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">Recipients</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900">{overview?.totalRecipients || 0}</p>
              <p className="text-[11px] text-slate-500 mt-2">
                <span className="font-semibold text-slate-700">{overview?.eligibleRecipients || 0}</span> eligible
              </p>
            </div>

            {/* Card 3: Confirmed Sent */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">Confirmed Sent</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {overview?.messagesManuallyConfirmed || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">Manually confirmed</p>
            </div>

            {/* Card 4: Chats Opened */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">Chats Opened</span>
                <Send className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-amber-600">
                {overview?.messagesOpened || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">Awaiting confirmation</p>
            </div>

            {/* Card 5: Skipped */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">Skipped</span>
                <AlertCircle className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-slate-700">{overview?.messagesSkipped || 0}</p>
              <p className="text-[11px] text-slate-500 mt-2">By admin action</p>
            </div>

            {/* Card 6: Failed / Pending */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">In Queue</span>
                <UserCheck className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-purple-700">
                {overview?.awaitingAction || 0}
              </p>
              <p className="text-[11px] text-rose-500 font-semibold mt-2">
                {overview?.failedToOpenAttempts || 0} failed attempts
              </p>
            </div>
          </div>

          {/* Charts Row 1: Line Trend & Recipient Status Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Activity & Outreach Volume Trend */}
            <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Outreach Volume & Confirmed Sends Trend
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Monthly recipient candidate volume versus manual confirmed sends over time.
                  </p>
                </div>
              </div>
              <LineTrendChart data={trends} />
            </div>

            {/* Right 1 Col: Recipient Status Donut */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Recipient Status Distribution
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live breakdown of all candidates across campaigns.
                  </p>
                </div>
              </div>
              <DonutStatusChart data={statusDist} />
            </div>
          </div>

          {/* Charts Row 2: Company Recruitment Performance & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Company-wise Performance */}
            <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    Company-Wise Campaign Performance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Eligible candidate volume, confirmed sends, and completion rates by company.
                  </p>
                </div>
                <Link
                  to="/reports"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  Export Report <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <CompanyBarChart data={companyPerf} />
            </div>

            {/* Right 1 Col: Module 9 Quick Hub Navigation */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Auditing & Reports Hub</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Access deep candidate audit logs, multi-campaign comparisons, and download official placement reports.
                </p>

                <div className="mt-4 space-y-2.5">
                  <Link
                    to="/recipient-tracking"
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                          Recipient Tracking Table
                        </p>
                        <p className="text-[11px] text-slate-400">Masked phone numbers & retry audits</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    to="/campaign-comparison"
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-purple-600">
                          Campaign Comparison Tool
                        </p>
                        <p className="text-[11px] text-slate-400">Side-by-side drive metrics</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    to="/reports"
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600">
                          Reports & Downloads Center
                        </p>
                        <p className="text-[11px] text-slate-400">Excel (.xlsx), CSV, and PDF exports</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Active Scope: {dateRange}
                </span>
                <span>Placement Auto 2026</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
