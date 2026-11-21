import React, { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  FolderTree,
  Send,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { checkApiHealth } from '../services/healthService';
import { getDashboardStats } from '../services/dashboardService';
import { HealthStatus, DashboardStats } from '../types';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      setStatsError('Unable to load dashboard metrics from database.');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    checkApiHealth()
      .then((data) => {
        setHealth(data);
        setLoadingHealth(false);
      })
      .catch(() => {
        setHealth({ success: false, message: 'Could not connect to API server' });
        setLoadingHealth(false);
      });

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name || 'Admin'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Authenticated
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time placement drive metrics and candidate automation status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchStats}
            title="Refresh database metrics"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs text-xs">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 font-medium">API:</span>
            {loadingHealth ? (
              <span className="text-slate-400">Checking...</span>
            ) : health?.success ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="text-rose-600 font-semibold">Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Error alert if stats fetch failed */}
      {statsError && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{statsError}</span>
          </div>
          <button
            onClick={fetchStats}
            className="font-semibold underline hover:text-amber-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 4 Functional Stat Cards with Loading Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-3"
            >
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
              <div className="h-2.5 bg-slate-100 rounded w-2/3" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Candidates"
              value={stats?.totalCandidates ?? 0}
              subtitle="Registered in MongoDB collection"
              icon={Users}
            />
            <StatCard
              title="Total Companies"
              value={stats?.totalCompanies ?? 0}
              subtitle="Visiting corporate partners"
              icon={Building2}
            />
            <StatCard
              title="Active Virtual Groups"
              value={stats?.activeVirtualGroups ?? 0}
              subtitle="Company-specific groups"
              icon={FolderTree}
            />
            <StatCard
              title="Messages Sent"
              value={stats?.messagesSent ?? 0}
              subtitle="Dispatched via messaging engine"
              icon={Send}
            />
          </>
        )}
      </div>

      {/* Overview & Security Architecture Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Authenticated Session Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Active Admin Session Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified via HttpOnly JWT Cookie & Anti-CSRF Token
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Session Verified
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium">Logged-in Administrator</span>
                <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
                <p className="text-slate-600 font-mono">{user?.email}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium">Role & Account Status</span>
                <p className="font-semibold text-slate-900 capitalize">{user?.role}</p>
                <p className="text-emerald-600 font-medium">Active (Password Hashed with bcrypt)</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Protected Stats Endpoint: GET /api/dashboard/stats
                </span>
                <span className="font-mono text-slate-500">200 OK</span>
              </div>
              <div className="font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
                {JSON.stringify(
                  {
                    success: true,
                    data: stats || {
                      totalCandidates: 0,
                      totalCompanies: 0,
                      activeVirtualGroups: 0,
                      messagesSent: 0,
                    },
                  },
                  null,
                  2
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Project Roadmap Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Implementation Progress
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Module 1 (Done)</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-medium">Complete</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Architecture initialization, navigation structure & health check.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Module 2 (Current)</span>
                  <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-medium">Active</span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  JWT authentication, HttpOnly cookies, CSRF protection & live stats.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Module 3</span>
                  <span className="text-[10px] text-slate-400">Upcoming</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Candidate & Company management schemas and CRUD operations.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>Awaiting Module 3 Approval</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
