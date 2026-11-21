import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderTree,
  Users,
  Send,
  Plus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Cloud,
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

  const totalGroups = stats?.totalGroups ?? stats?.activeVirtualGroups ?? 0;
  const totalStudents = stats?.totalStudentNumbers ?? stats?.totalCandidates ?? 0;
  const totalSent = stats?.totalMessagesSent ?? stats?.messagesSent ?? 0;
  const recentCampaigns = stats?.recentCampaigns || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            WhatsApp Bulk Messaging
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, <span className="font-semibold text-slate-700">{user?.name || 'Administrator'}</span>. Manage groups, student contact numbers, and WhatsApp dispatches directly.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/groups"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Group
          </Link>
          <Link
            to="/whatsapp-connection"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-500" />
            WhatsApp Connection
          </Link>
          <button
            onClick={fetchStats}
            title="Refresh metrics"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
            className="text-xs font-semibold text-amber-900 underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Groups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Groups
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {loading ? '...' : totalGroups}
            </span>
            <Link
              to="/groups"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Company contact lists</p>
        </div>

        {/* Card 2: Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Registered Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {loading ? '...' : totalStudents}
            </span>
            <span className="text-xs font-bold text-blue-600">Mobile Numbers</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for individual messaging</p>
        </div>

        {/* Card 3: Messages Sent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Messages Sent
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {loading ? '...' : totalSent}
            </span>
            <span className="text-xs font-bold text-indigo-600">Delivered</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Official Cloud API dispatches</p>
        </div>

        {/* Card 4: WhatsApp Gateway */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              WhatsApp Gateway
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-base font-extrabold text-emerald-700 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Connected
            </span>
            <Link
              to="/whatsapp-connection"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Settings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Meta Business Cloud API</p>
        </div>
      </div>

      {/* Simplified 3-Step Flow Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-100 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3">
          How to Send Bulk WhatsApp Messages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">Create Group</span>
              <p className="text-slate-500 mt-1">
                Enter your group name (e.g. TCS, Infosys, Wipro). Whatever name you give is the group & company.
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">Add Mobile Numbers</span>
              <p className="text-slate-500 mt-1">
                Add numbers individually or paste in bulk from Excel or text files directly inside the group.
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <span className="font-extrabold text-slate-900 text-sm block">Write & Send To All</span>
              <p className="text-slate-500 mt-1">
                Compose your message directly inside the group and click "SEND TO ALL" for automated individual delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Dispatches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900">Recent WhatsApp Dispatches</h2>
          </div>
          <Link
            to="/groups"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View Groups <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No WhatsApp dispatches recorded yet. Open a group to send your first message!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Group / Dispatch Name</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Recipients</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {recentCampaigns.map((camp: any) => {
                  const gId = typeof camp.groupId === 'object' ? camp.groupId?._id : camp.groupId;
                  return (
                    <tr key={camp._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-900">
                        {camp.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            camp.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : camp.status === 'IN_PROGRESS' || camp.status === 'RUNNING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {camp.metrics?.processedRecipients || camp.metrics?.eligibleRecipients || 0}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-right">
                        {gId ? (
                          <Link
                            to={`/groups/${gId}`}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-end gap-1"
                          >
                            Open Group <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <Link
                            to={`/campaigns/${camp._id}`}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-end gap-1"
                          >
                            View Tracker <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
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
