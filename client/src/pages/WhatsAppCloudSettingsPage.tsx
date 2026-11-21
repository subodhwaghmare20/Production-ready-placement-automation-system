import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Save,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  KeyRound,
  ShieldAlert,
  Server,
  Sparkles,
  Info,
} from 'lucide-react';
import { cloudApiService, TestConnectionResponse } from '../services/cloudApiService';
import { WhatsAppCloudConfigData, WhatsAppCloudConnectionStatus } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const SETUP_STEPS = [
  {
    step: 1,
    title: 'Create Meta Developer Account',
    description: 'Sign up or log in at developers.facebook.com and complete account verification.',
  },
  {
    step: 2,
    title: 'Create a Meta App',
    description: 'Click "Create App", select the "Business" or "Other" app type, and name your app (e.g., "Placement Automation").',
  },
  {
    step: 3,
    title: 'Add WhatsApp Product',
    description: 'In your App Dashboard, locate "WhatsApp" in the product catalog and click "Set Up".',
  },
  {
    step: 4,
    title: 'Configure WhatsApp Business Account (WABA)',
    description: 'Link an existing Meta Business Account or let Meta auto-create a sandboxed test account.',
  },
  {
    step: 5,
    title: 'Business Phone Number Registration',
    description: 'Use the free Meta test number (+1 555-...) for initial testing or register a dedicated clean business number.',
  },
  {
    step: 6,
    title: 'Obtain WhatsApp Business Account ID (WABA ID)',
    description: 'Found under WhatsApp > API Setup > Step 1 in your Meta Developer Dashboard.',
  },
  {
    step: 7,
    title: 'Obtain Phone Number ID',
    description: 'Found right below the sender phone selector in the API Setup tab.',
  },
  {
    step: 8,
    title: 'Generate System User Access Token',
    description: 'Create a System User in Meta Business Suite > Users > System Users with "whatsapp_business_messaging" permissions to obtain a permanent token.',
  },
  {
    step: 9,
    title: 'Configure Permissions',
    description: 'Ensure token has both "whatsapp_business_messaging" and "whatsapp_business_management" permissions.',
  },
  {
    step: 10,
    title: 'Configure Webhook Callback URL',
    description: 'In WhatsApp > Configuration > Webhook, paste the Callback URL and Verify Token shown below.',
  },
  {
    step: 11,
    title: 'Subscribe to Webhook Fields',
    description: 'Click "Manage Webhook Fields" and subscribe to "messages" to receive delivery statuses and candidate replies.',
  },
  {
    step: 12,
    title: 'Test Sending & Validation',
    description: 'Click "Test Connection" below to verify end-to-end Graph API authentication and connectivity.',
  },
];

export const WhatsAppCloudSettingsPage: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppCloudConfigData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  // Form states
  const [appId, setAppId] = useState<string>('');
  const [appSecret, setAppSecret] = useState<string>('');
  const [wabaId, setWabaId] = useState<string>('');
  const [phoneNumberId, setPhoneNumberId] = useState<string>('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState<string>('');
  const [graphApiVersion, setGraphApiVersion] = useState<string>('v21.0');
  const [isMockMode, setIsMockMode] = useState<boolean>(true);
  const [webhookCallbackUrl, setWebhookCallbackUrl] = useState<string>('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await cloudApiService.getConnectionSettings();
      setConfig(data);
      setAppId(data.appId || '');
      setAppSecret(data.appSecret || '');
      setWabaId(data.wabaId || '');
      setPhoneNumberId(data.phoneNumberId || '');
      setDisplayPhoneNumber(data.displayPhoneNumber || '');
      setAccessToken(data.accessToken || '');
      setWebhookVerifyToken(data.webhookVerifyToken || '');
      setGraphApiVersion(data.graphApiVersion || 'v21.0');
      setIsMockMode(data.isMockMode ?? true);
      setWebhookCallbackUrl(data.webhookCallbackUrl || '');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load Cloud API settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      setSaving(true);
      const updated = await cloudApiService.updateConnectionSettings({
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        displayPhoneNumber: displayPhoneNumber.trim(),
        accessToken: accessToken.trim(),
        webhookVerifyToken: webhookVerifyToken.trim(),
        graphApiVersion: graphApiVersion.trim(),
        isMockMode,
        webhookCallbackUrl: webhookCallbackUrl.trim(),
      });
      setConfig(updated);
      setMessage({ type: 'success', text: 'WhatsApp Cloud API settings saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setMessage(null);
    try {
      const res = await cloudApiService.testConnection({
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        accessToken: accessToken.trim(),
        graphApiVersion: graphApiVersion.trim(),
        isMockMode,
      });
      setTestResult(res);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        loadSettings();
      } else {
        setMessage({ type: 'error', text: res.error || res.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: WhatsAppCloudConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected (Live Meta API)
          </span>
        );
      case 'TEST_MODE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3.5 h-3.5" /> Test / Mock Mode Active
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Connection Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Not Configured
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                WhatsApp Business Cloud API Gateway
              </h1>
              <p className="text-sm text-slate-500">
                Official Meta WhatsApp Business Platform integration, Webhook verification & automated messaging
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowWizard(!showWizard)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            {showWizard ? 'Hide Setup Wizard' : '12-Step Setup Wizard'}
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing Connection...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="text-sm font-medium">{message.text}</div>
        </div>
      )}

      {/* Connection Status & Account Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">Gateway Status</h2>
              {getStatusBadge(config?.connectionStatus || 'NOT_CONFIGURED')}
            </div>
            <p className="text-sm text-slate-500">
              {config?.connectionStatus === 'CONNECTED'
                ? 'Authenticated and verified with Meta Graph API servers.'
                : config?.connectionStatus === 'TEST_MODE'
                ? 'Operating in Test/Mock Mode. Ready for end-to-end simulated sending and webhook validation without live Meta billing.'
                : 'Credentials required to establish live automated messaging.'}
            </p>
          </div>

          {config?.lastVerifiedAt && (
            <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              Last verified: {new Date(config.lastVerifiedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Verified Account Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Verified Business Name
            </span>
            <span className="text-sm font-bold text-slate-800 mt-1 block truncate">
              {config?.verifiedName || testResult?.details?.verifiedName || 'Placement Automation Gateway'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Sender Display Phone
            </span>
            <span className="text-sm font-bold text-slate-800 mt-1 block font-mono">
              {config?.displayPhoneNumber || testResult?.details?.displayPhoneNumber || '+1 555-0199 (Test)'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Quality Rating
            </span>
            <span className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {config?.qualityRating || 'HIGH (Green)'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Graph API Version
            </span>
            <span className="text-sm font-bold text-slate-800 mt-1 block font-mono">
              {config?.graphApiVersion || 'v21.0'}
            </span>
          </div>
        </div>
      </div>

      {/* Important Notice on Phone Coexistence */}
      <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-4 text-amber-900">
        <ShieldAlert className="w-6 h-6 shrink-0 text-amber-600 mt-0.5" />
        <div className="text-sm space-y-1">
          <h3 className="font-bold">Phone Number Co-existence & Eligibility Guidance</h3>
          <p className="text-amber-800 text-xs sm:text-sm leading-relaxed">
            Meta's WhatsApp Business Platform requires a dedicated business phone number. An active number currently logged into a personal or business WhatsApp mobile app <strong>cannot</strong> simultaneously receive Cloud API webhooks or dispatch automated templates without being deregistered from the mobile app.
          </p>
          <p className="text-amber-800 text-xs sm:text-sm font-semibold">
            To protect your existing personal WhatsApp communication, your personal number has NOT been migrated. Use Meta's provided sandboxed test number or a separate clean SIM for Cloud API automation.
          </p>
        </div>
      </div>

      {/* Setup Wizard (Collapsible) */}
      {showWizard && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                12-Step Guided Official Setup Wizard
              </h3>
              <p className="text-xs text-slate-500">
                Follow these instructions to connect your official Meta WhatsApp Business Cloud API
              </p>
            </div>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Meta Official Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {SETUP_STEPS.map((s) => {
              const isExpanded = expandedStep === s.step;
              return (
                <div
                  key={s.step}
                  onClick={() => setExpandedStep(isExpanded ? null : s.step)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isExpanded
                      ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">{s.title}</h4>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {isExpanded && (
                    <p className="mt-2 text-xs text-slate-600 pl-8 leading-relaxed">
                      {s.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Webhook Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            Meta Webhook Callback Configuration
          </h3>
          <p className="text-xs text-slate-500">
            Paste these exact values in your Meta Developer Portal under WhatsApp &gt; Configuration &gt; Webhook
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Callback URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Callback URL
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800">
              <span className="truncate flex-1">{webhookCallbackUrl}</span>
              <button
                type="button"
                onClick={() => handleCopy(webhookCallbackUrl, 'url')}
                className="ml-2 p-1 text-slate-500 hover:text-slate-800 transition"
                title="Copy Callback URL"
              >
                {copiedField === 'url' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Must be publicly reachable (use local tunnel such as ngrok or cloud domain in production)
            </p>
          </div>

          {/* Verify Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Verify Token
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800">
              <span className="truncate flex-1">{webhookVerifyToken || 'placement_auto_webhook_verify_token_2026'}</span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    webhookVerifyToken || 'placement_auto_webhook_verify_token_2026',
                    'token'
                  )
                }
                className="ml-2 p-1 text-slate-500 hover:text-slate-800 transition"
                title="Copy Verify Token"
              >
                {copiedField === 'token' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Meta verifies this during the GET handshake challenge
            </p>
          </div>
        </div>
      </div>

      {/* Main Credentials Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-slate-700" />
              Meta Cloud API Credentials (Encrypted at Rest)
            </h3>
            <p className="text-xs text-slate-500">
              Stored securely using AES-256-GCM encryption. Tokens are masked and never exposed to the browser.
            </p>
          </div>

          {/* Test / Mock Mode Toggle */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-slate-700">Test / Mock Mode</span>
            <button
              type="button"
              onClick={() => setIsMockMode(!isMockMode)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                isMockMode ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                  isMockMode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Meta App ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Meta App ID
            </label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="e.g. 102938475610293"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Meta App Secret */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Meta App Secret (Used for HMAC Webhook Validation)
            </label>
            <input
              type="text"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* WABA ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              WhatsApp Business Account ID (WABA ID)
            </label>
            <input
              type="text"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="e.g. 109283746501928"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Phone Number ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Phone Number ID
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="e.g. 504938271625341"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Display Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Business Display Phone Number
            </label>
            <input
              type="text"
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              placeholder="+1 555-0199 or +91 9876543210"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Graph API Version */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Graph API Version
            </label>
            <input
              type="text"
              value={graphApiVersion}
              onChange={(e) => setGraphApiVersion(e.target.value)}
              placeholder="v21.0"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* System User Access Token */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Permanent / System User Access Token</span>
              <span className="text-slate-400 text-[11px] normal-case">Leave masked to preserve existing saved token</span>
            </label>
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAABw..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500" />
            Changes take effect immediately across all automated campaign dispatches.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
