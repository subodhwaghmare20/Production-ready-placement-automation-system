import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  FolderTree,
  Users,
  Send,
  Plus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { getDashboardStats } from '../services/dashboardService';
import { DashboardStats } from '../types';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      setError('Unable to load dashboard metrics. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalCompanies = stats?.totalCompanies ?? 0;
  const totalGroups = stats?.totalGroups ?? stats?.activeVirtualGroups ?? 0;
  const totalStudents = stats?.totalStudentNumbers ?? stats?.totalCandidates ?? 0;
  const totalSent = stats?.totalMessagesSent ?? stats?.messagesSent ?? 0;
  const recentCampaigns = stats?.recentCampaigns || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            WhatsApp Bulk Messaging Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, <span className="font-semibold text-slate-700">{user?.name || 'Administrator'}</span>. Manage companies, student groups, and Cloud API broadcasts.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/companies"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            Create Company
          </Link>
          <Link
            to="/groups"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            Create Group
          </Link>
          <Link
            to="/send-message"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Send Message
          </Link>
          <button
            onClick={fetchStats}
            title="Refresh metrics"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="text-xs font-semibold text-amber-900 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* The 4 Core Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Companies */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Companies
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : totalCompanies}
            </span>
            <Link
              to="/companies"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-400">Companies with messaging groups</p>
        </div>

        {/* Card 2: Total Groups */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Groups
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : totalGroups}
            </span>
            <Link
              to="/groups"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-400">Virtual student contact lists</p>
        </div>

        {/* Card 3: Total Student Numbers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Student Numbers
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : totalStudents}
            </span>
            <Link
              to="/groups"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5"
            >
              Numbers <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-400">Active numbers enrolled across groups</p>
        </div>

        {/* Card 4: Total Messages Sent */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Messages Sent
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '—' : totalSent}
            </span>
            <Link
              to="/send-message"
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-0.5"
            >
              Broadcast <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-400">Individual WhatsApp messages dispatched</p>
        </div>
      </div>

      {/* Main Flow Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold">Standard 4-Step Messaging Flow</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Follow this sequence to send official WhatsApp broadcasts to any batch of students:
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="px-2.5 py-1 bg-white/10 rounded-md">1. Company</span>
            <span>→</span>
            <span className="px-2.5 py-1 bg-white/10 rounded-md">2. Group</span>
            <span>→</span>
            <span className="px-2.5 py-1 bg-white/10 rounded-md">3. Paste Numbers</span>
            <span>→</span>
            <span className="px-2.5 py-1 bg-emerald-500 text-white font-semibold rounded-md">4. Send To All</span>
          </div>
        </div>
      </div>

      {/* Recent Campaigns Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Campaigns</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live broadcast history and delivery tracking
            </p>
          </div>
          <Link
            to="/send-message"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Launch New Message <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
            Loading campaigns...
          </div>
        ) : recentCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No campaigns launched yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create a group with student mobile numbers, then click Send Message to dispatch your first WhatsApp broadcast!
            </p>
            <div className="mt-4">
              <Link
                to="/send-message"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Go to Send Message
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Campaign / Group</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Recipients</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCampaigns.map((camp) => {
                  const companyName = camp.companyId?.companyName || '—';
                  const groupName = camp.groupId?.groupName || camp.name || 'Group Campaign';
                  const total = camp.totalRecipients || camp.metrics?.totalRecipients || 0;
                  const isDone = camp.status === 'COMPLETED';
                  const isInProgress = camp.status === 'IN_PROGRESS';

                  return (
                    <tr key={camp._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {groupName}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {companyName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="font-semibold text-slate-900">{total}</span> students
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isInProgress
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/campaigns/${camp._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          View Progress <ArrowRight className="w-3 h-3" />
                        </Link>
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

export default DashboardPage;
