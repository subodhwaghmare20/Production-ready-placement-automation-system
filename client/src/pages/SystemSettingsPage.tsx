import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Building,
  Users,
  Shield,
  Bell,
  Send,
  Cpu,
  HardDrive,
  Clock,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { SystemSettingsData, SystemStatsData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const TABS = [
  { id: 'general', label: 'General', icon: Building },
  { id: 'candidate', label: 'Candidates', icon: Users },
  { id: 'campaign', label: 'Messaging & Campaigns', icon: Send },
  { id: 'security', label: 'Security & Password', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'diagnostics', label: 'System Health & Stats', icon: Server },
] as const;

type TabType = (typeof TABS)[number]['id'];

export const SystemSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshingStats, setRefreshingStats] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  // Diagnostics Stats State
  const [stats, setStats] = useState<SystemStatsData | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsData, statsData] = await Promise.all([
        adminService.getSystemSettings(),
        adminService.getSystemStats().catch(() => null),
      ]);
      setSettings(settingsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load system settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshStats = async () => {
    try {
      setRefreshingStats(true);
      const statsData = await adminService.getSystemStats();
      setStats(statsData);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to refresh system statistics' });
    } finally {
      setRefreshingStats(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setMessage(null);
      const updated = await adminService.updateSystemSettings(settings);
      setSettings(updated);
      setMessage({ type: 'success', text: 'System configuration updated successfully and active across all modules.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update system settings' });
    } finally {
      setSaving(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  if (loading || !settings) {
    return (
      <div className="p-16 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings & Configuration</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Settings className="w-3 h-3" /> Global Config
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure system-wide parameters, password complexity, recruitment defaults, and monitor infrastructure health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-semibold underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <form onSubmit={handleSave}>
        {/* 1. GENERAL SETTINGS TAB */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">General Application Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary branding, contact information, and localization parameters for the console.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Application Name</label>
                <input
                  type="text"
                  value={settings.general.applicationName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, applicationName: e.target.value },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization / College Name</label>
                <input
                  type="text"
                  value={settings.general.organizationName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, organizationName: e.target.value },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Contact Email</label>
                <input
                  type="email"
                  value={settings.general.organizationEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, organizationEmail: e.target.value },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Contact Phone</label>
                <input
                  type="text"
                  value={settings.general.organizationPhone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, organizationPhone: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Timezone</label>
                <select
                  value={settings.general.defaultTimezone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, defaultTimezone: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST / EDT)</option>
                  <option value="Europe/London">Europe/London (GMT / BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date Display Format</label>
                <select
                  value={settings.general.dateFormat}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, dateFormat: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 21/11/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/21/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 2. CANDIDATE SETTINGS TAB */}
        {activeTab === 'candidate' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Candidate Pipeline & Import Defaults</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure candidate onboarding defaults, resume upload limits, and duplicate matching attributes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Placement Status</label>
                <select
                  value={settings.candidate.defaultPlacementStatus}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      candidate: { ...settings.candidate, defaultPlacementStatus: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Available">Available (Ready for recruitment)</option>
                  <option value="Placed">Placed (Already recruited)</option>
                  <option value="Inactive">Inactive (Not seeking opportunities)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Resume File Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={settings.candidate.maxResumeFileSizeMb}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      candidate: {
                        ...settings.candidate,
                        maxResumeFileSizeMb: Number(e.target.value),
                      },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Allowed Contact Import Formats</label>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  {['XLSX', 'XLS', 'CSV'].map((format) => {
                    const isChecked = settings.candidate.allowedImportFormats.includes(format);
                    return (
                      <label key={format} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newFormats = e.target.checked
                              ? [...settings.candidate.allowedImportFormats, format]
                              : settings.candidate.allowedImportFormats.filter((f) => f !== format);
                            setSettings({
                              ...settings,
                              candidate: { ...settings.candidate, allowedImportFormats: newFormats },
                            });
                          }}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span>{format} Spreadsheet</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Allowed Resume File Extensions</label>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  {['.pdf', '.docx', '.doc'].map((ext) => {
                    const isChecked = settings.candidate.allowedResumeFileTypes.includes(ext);
                    return (
                      <label key={ext} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...settings.candidate.allowedResumeFileTypes, ext]
                              : settings.candidate.allowedResumeFileTypes.filter((t) => t !== ext);
                            setSettings({
                              ...settings,
                              candidate: { ...settings.candidate, allowedResumeFileTypes: newTypes },
                            });
                          }}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span>{ext}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CAMPAIGN & MESSAGING TAB */}
        {activeTab === 'campaign' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">WhatsApp Messaging & Campaign Policies</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set dispatch defaults, default provider mode, and campaign execution safeguards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Message Provider</label>
                <select
                  value={settings.campaign.defaultMessageProvider}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      campaign: {
                        ...settings.campaign,
                        defaultMessageProvider: e.target.value as 'PERSONAL_ASSISTED' | 'CLOUD_API',
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="PERSONAL_ASSISTED">Personal WhatsApp Assisted (wa.me click-to-chat)</option>
                  <option value="CLOUD_API">Official WhatsApp Business Cloud API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Batch Size</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={settings.campaign.defaultBatchSize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      campaign: { ...settings.campaign, defaultBatchSize: Number(e.target.value) },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Template Language</label>
                <input
                  type="text"
                  value={settings.campaign.defaultMessageLanguage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      campaign: { ...settings.campaign, defaultMessageLanguage: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="reqApproval"
                  checked={settings.campaign.requireCampaignApproval}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      campaign: { ...settings.campaign, requireCampaignApproval: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="reqApproval" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Require Super Admin Approval before dispatching campaigns with &gt; 100 recipients
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. SECURITY & PASSWORD POLICY TAB */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Security & Authentication Policies</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Brute-force lockout parameters, password complexity enforcement, and session idle expiration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Max Consecutive Failed Login Attempts
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, maxLoginAttempts: Number(e.target.value) },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Exceeding this threshold will trigger a temporary HTTP 423 lockout on the account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Lockout Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.security.lockoutDurationMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, lockoutDurationMinutes: Number(e.target.value) },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Duration before a locked administrator can re-attempt credentials or request an admin unlock.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Session Expiration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={settings.security.sessionTimeoutHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeoutHours: Number(e.target.value) },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min="8"
                  max="32"
                  value={settings.security.minPasswordLength}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, minPasswordLength: Number(e.target.value) },
                    })
                  }
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="md:col-span-2 pt-2 space-y-3">
                <span className="block text-xs font-semibold text-slate-700">Password Complexity Enforcement</span>
                
                <label className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.requireUppercase}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, requireUppercase: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Require at least one uppercase letter (A-Z)</span>
                </label>

                <label className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.requireNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, requireNumber: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Require at least one number (0-9)</span>
                </label>

                <label className="flex items-center gap-3 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.requireSpecialChar}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, requireSpecialChar: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Require at least one special character (!@#$%^&*...)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 5. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Alerts & Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable automated notifications for campaign statuses, security events, and administrative activities.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Email Notifications Channel</h4>
                  <p className="text-xs text-slate-500">Send critical alerts and digests to administrator email addresses.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotificationsEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        emailNotificationsEnabled: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">In-App Notification Center</h4>
                  <p className="text-xs text-slate-500">Display real-time notification toasts and badges inside the console.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.inAppNotificationsEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        inAppNotificationsEnabled: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Campaign Completion Digest</h4>
                  <p className="text-xs text-slate-500">Notify when a messaging batch or blast finishes processing.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.campaignCompletedAlert}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        campaignCompletedAlert: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Campaign Delivery Failure Alert</h4>
                  <p className="text-xs text-slate-500">Immediate alert when any campaign encounters critical API or sending errors.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.campaignFailedAlert}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        campaignFailedAlert: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Security & Account Lockout Alerts</h4>
                  <p className="text-xs text-slate-500">Notify Super Admins when brute-force lockouts or role modifications occur.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.adminActivityAlert}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        adminActivityAlert: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. SYSTEM HEALTH & DIAGNOSTICS TAB */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Database Record Totals</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time counts aggregated directly from MongoDB collections.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshStats}
                  disabled={refreshingStats}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
                  Refresh Diagnostics
                </button>
              </div>

              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">Candidates</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.recordCounts.candidates.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">Companies</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.recordCounts.companies.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">Virtual Groups</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.recordCounts.groups.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">Campaigns</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.recordCounts.campaigns.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">Administrators</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.recordCounts.admins.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-medium">Audit Logs</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.recordCounts.auditLogs.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Infrastructure Health Status */}
            {stats && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Server & Environment Health</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Runtime diagnostics and process resource metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">System Status</span>
                      <p className="text-sm font-bold text-emerald-600 uppercase">{stats.health.status}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Server Uptime</span>
                      <p className="text-sm font-bold text-slate-900">{formatUptime(stats.health.uptimeSeconds)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Node.js Runtime</span>
                      <p className="text-sm font-bold text-slate-900 font-mono">{stats.health.nodeVersion}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Heap Memory</span>
                      <p className="text-sm font-bold text-slate-900 font-mono">
                        {stats.health.memoryUsageMb} MB / {stats.health.totalHeapMb} MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
