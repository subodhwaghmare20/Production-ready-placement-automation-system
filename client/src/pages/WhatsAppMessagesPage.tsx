import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Play,
  Eye,
  FileCode2,
  RefreshCw,
  BarChart3,
  UserCheck,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { campaignService } from '../services/campaignService';
import { WhatsAppCampaign, WhatsAppDashboardStats, WhatsAppCampaignStatus } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const WhatsAppMessagesPage: React.FC = () => {
  const [stats, setStats] = useState<WhatsAppDashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, campaignsData] = await Promise.all([
        campaignService.getDashboardStats(),
        campaignService.getCampaigns({
          status: statusFilter !== 'ALL' ? (statusFilter as WhatsAppCampaignStatus) : undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setStats(statsData);
      setCampaigns(campaignsData.campaigns);
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getStatusBadge = (status: WhatsAppCampaignStatus) => {
    switch (status) {
      case 'PREPARED':
        return <Badge variant="info">Prepared</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'PAUSED':
        return <Badge variant="default">Paused</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              WhatsApp Messaging Engine
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Personal WhatsApp Assisted
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Compliant, personal WhatsApp assisted candidate communication with prefilled click-to-chat links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/campaign-analytics"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            Analytics
          </Link>
          <Link
            to="/recipient-tracking"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            Recipients
          </Link>
          <Link
            to="/message-templates"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
            Templates
          </Link>
          <Link
            to="/whatsapp-messages/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Module 9 Sub-Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs">
        <Link
          to="/whatsapp-messages"
          className="px-4 py-2.5 font-bold text-slate-900 border-b-2 border-slate-900 flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Campaigns
        </Link>
        <Link
          to="/campaign-analytics"
          className="px-4 py-2.5 font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent flex items-center gap-1.5 transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          Analytics & Trends
        </Link>
        <Link
          to="/recipient-tracking"
          className="px-4 py-2.5 font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent flex items-center gap-1.5 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          Recipient Tracking
        </Link>
        <Link
          to="/campaign-comparison"
          className="px-4 py-2.5 font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent flex items-center gap-1.5 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-purple-500" />
          Compare Campaigns
        </Link>
        <Link
          to="/reports"
          className="px-4 py-2.5 font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent flex items-center gap-1.5 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          Audit Reports
        </Link>
      </div>

      {/* Mode Compliance Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg shrink-0 text-emerald-700">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="text-xs text-emerald-900">
          <p className="font-semibold text-sm text-emerald-950">
            Active Mode: Personal WhatsApp Web Assisted Dispatch
          </p>
          <p className="mt-0.5 text-emerald-800">
            Messages are prepared securely with student variables and sent individually through official WhatsApp
            click-to-chat links. No reverse-engineered APIs, bulk bots, or extensions are used, guaranteeing your
            personal WhatsApp account remains safe and compliant.
          </p>
        </div>
      </div>

      {/* Real-time Dashboard Statistics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Total Campaigns</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.totalCampaigns}</div>
            <span className="text-[11px] text-slate-400">Created recruitment drives</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Total Recipients</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.totalRecipients}</div>
            <span className="text-[11px] text-slate-400">Targeted candidates</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Messages Prepared</span>
            <div className="text-xl font-bold text-amber-600 mt-1">{stats.messagesPrepared}</div>
            <span className="text-[11px] text-slate-400">Ready in queue</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Manually Confirmed</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">{stats.messagesManuallyConfirmed}</div>
            <span className="text-[11px] text-slate-400">Verified dispatched</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Pending Messages</span>
            <div className="text-xl font-bold text-blue-600 mt-1">{stats.pendingMessages}</div>
            <span className="text-[11px] text-slate-400">Awaiting sending</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Active Drives</span>
            <div className="text-xl font-bold text-purple-600 mt-1">{stats.activeCampaigns}</div>
            <span className="text-[11px] text-slate-400">In-flight campaigns</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'PREPARED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Drives' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search campaign name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                loadData();
              }}
              title="Refresh"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Campaign Table */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No WhatsApp Campaigns Found"
            description="Create your first campaign to begin assisted personal WhatsApp candidate outreach."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/50">
                  <th className="py-3 px-4">Campaign & Target</th>
                  <th className="py-3 px-4">Recruitment Drive</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Manual Dispatch Progress</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => {
                  const company = typeof camp.companyId === 'object' ? camp.companyId : null;
                  const group = typeof camp.groupId === 'object' ? camp.groupId : null;
                  const eligible = camp.metrics?.eligibleRecipients || 0;
                  const confirmed = camp.metrics?.manuallyConfirmedCount || 0;
                  const progressPct =
                    eligible > 0 ? Math.round((confirmed / eligible) * 100) : 0;

                  return (
                    <tr key={camp._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/whatsapp-messages/${camp._id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 block"
                        >
                          {camp.name}
                        </Link>
                        <span className="text-[11px] font-mono text-slate-400">
                          {camp.campaignId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {company?.companyName || 'Unknown Company'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Group: {group?.groupName || 'Primary Group'} • {company?.jobRole}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(camp.status)}</td>

                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span>
                            {confirmed} of {eligible} Sent
                          </span>
                          <span className="font-semibold">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progressPct === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        {camp.metrics?.skippedCount > 0 && (
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {camp.metrics.skippedCount} skipped
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {camp.status !== 'COMPLETED' && camp.status !== 'CANCELLED' ? (
                            <Link
                              to={`/whatsapp-messages/${camp._id}/process`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
                            >
                              <Play className="w-3.5 h-3.5" />
                              {camp.status === 'PREPARED' ? 'Start Dispatch' : 'Resume'}
                            </Link>
                          ) : (
                            <Link
                              to={`/whatsapp-messages/${camp._id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Audit Log
                            </Link>
                          )}
                          <Link
                            to={`/whatsapp-messages/${camp._id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
