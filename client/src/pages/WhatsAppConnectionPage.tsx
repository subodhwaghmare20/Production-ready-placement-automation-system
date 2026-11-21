import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Server,
  Zap,
  HelpCircle,
  Save,
} from 'lucide-react';
import { cloudApiService, TestConnectionResponse } from '../services/cloudApiService';
import { WhatsAppCloudConfigData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const WhatsAppConnectionPage: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppCloudConfigData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  // Template sync state
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchConnectionSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cloudApiService.getConnectionSettings();
      setConfig(data);
      setPhoneNumberId(data.phoneNumberId || '');
      setWabaId(data.wabaId || '');
      setAccessToken(data.accessToken || '');
      setWebhookVerifyToken(data.webhookVerifyToken || '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load connection settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(null);
      setError(null);

      const updated = await cloudApiService.updateConnectionSettings({
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        accessToken: accessToken.trim(),
        webhookVerifyToken: webhookVerifyToken.trim(),
      });

      setConfig(updated);
      setSaveSuccess('WhatsApp API credentials saved successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await cloudApiService.testConnection();
      setTestResult(res);
      // Refresh config to reflect updated connection status
      fetchConnectionSettings();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Connection test failed',
        connectionStatus: 'ERROR',
        error: err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncTemplates = async () => {
    try {
      setSyncingTemplates(true);
      setSyncResult(null);
      const res = await cloudApiService.syncMetaTemplates();
      setSyncResult(
        `Successfully synced ${res.templates.length} templates from Meta WhatsApp Business!`
      );
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to sync Meta templates');
    } finally {
      setSyncingTemplates(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isConnected = config?.connectionStatus === 'CONNECTED';

  const isMock =
    config?.connectionStatus === 'TEST_MODE' ||
    Boolean(config?.isMockMode) ||
    Boolean(testResult?.details?.isMockMode);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="h-6 w-6 text-emerald-600" />
            WhatsApp Connection
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Meta WhatsApp Business Cloud API integration and account configuration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncTemplates}
            disabled={syncingTemplates}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingTemplates ? 'animate-spin' : ''}`} />
            Sync Meta Templates
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs gap-1.5 transition-colors disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {syncResult && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
          <span>{syncResult}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Test Connection Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <div className="font-bold text-sm">
              {testResult.success ? 'Connection Successful!' : 'Connection Check Failed'}
            </div>
            <div>{testResult.message}</div>
            {testResult.details && (
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                {testResult.details.verifiedName && (
                  <div>Verified Name: {testResult.details.verifiedName}</div>
                )}
                {testResult.details.displayPhoneNumber && (
                  <div>Display Phone: {testResult.details.displayPhoneNumber}</div>
                )}
                {testResult.details.qualityRating && (
                  <div>Quality: {testResult.details.qualityRating}</div>
                )}
              </div>
            )}
            {testResult.error && (
              <div className="text-red-700 font-mono text-[11px] mt-1">
                Details: {testResult.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-600'
                  : isMock
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">
                Official WhatsApp Business Cloud API
              </div>
              <div className="text-xs text-slate-500">
                Direct integration with Meta Graph API v20.0+
              </div>
            </div>
          </div>

          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isMock
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-500'
                    : isMock
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              />
              {isConnected
                ? 'CONNECTED'
                : isMock
                ? 'SIMULATED / TEST MODE'
                : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Live Config Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 font-medium">Verified Phone Number</div>
            <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
              {config?.displayPhoneNumber || '+91 98765 00000'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 font-medium">Business Account (WABA ID)</div>
            <div className="font-mono font-bold text-slate-800 text-sm mt-0.5 truncate">
              {config?.wabaId || 'Not Configured'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 font-medium">Phone Number ID</div>
            <div className="font-mono font-bold text-slate-800 text-sm mt-0.5 truncate">
              {config?.phoneNumberId || 'Not Configured'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 font-medium">Account Quality Rating</div>
            <div className="font-bold text-emerald-600 text-sm mt-0.5 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              {config?.qualityRating || 'GREEN (HIGH)'}
            </div>
          </div>
        </div>
      </div>

      {/* API Credentials Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Key className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            Configure Meta Cloud API Credentials
          </h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Phone Number ID *
              </label>
              <input
                type="text"
                placeholder="e.g. 109823471092384"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full text-sm font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Found under Meta for Developers &gt; WhatsApp &gt; API Setup
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA ID) *
              </label>
              <input
                type="text"
                placeholder="e.g. 192837401928374"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="w-full text-sm font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Identifies your WhatsApp Business account
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Permanent System User Access Token *
            </label>
            <input
              type="password"
              placeholder="EAAG... (Meta System User Access Token)"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full text-sm font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              System user token with <code className="font-mono">whatsapp_business_messaging</code> and <code className="font-mono">whatsapp_business_management</code> permissions.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Webhook Verification Token
            </label>
            <input
              type="text"
              placeholder="e.g. your_secret_webhook_verify_token"
              value={webhookVerifyToken}
              onChange={(e) => setWebhookVerifyToken(e.target.value)}
              className="w-full text-sm font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Token configured in Meta App Dashboard for webhook verification handshake.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save API Credentials'}
            </button>
          </div>
        </form>
      </div>

      {/* Educational Guide Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <HelpCircle className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            WhatsApp Platform Architecture & Best Practices
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Official Business Cloud API vs Personal WhatsApp
            </div>
            <p className="leading-relaxed">
              Unlike personal WhatsApp or QR-based web wrappers, the official Cloud API does not require keeping a phone online or clicking manual <code className="font-mono">wa.me</code> links.
            </p>
            <p className="leading-relaxed">
              When you send a message, Meta's cloud servers dispatch each message individually to student numbers in real time with high throughput and zero risk of personal phone bans.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600" />
              Real-time Webhook Status Tracking
            </div>
            <p className="leading-relaxed">
              Meta dispatches webhook callbacks when a student receives or opens your message:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-700">
              <li><strong className="text-blue-700">SENT</strong>: Message accepted by Meta servers</li>
              <li><strong className="text-emerald-700">DELIVERED</strong>: Delivered to student's handset</li>
              <li><strong className="text-teal-700">READ</strong>: Read by the student (blue ticks)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
