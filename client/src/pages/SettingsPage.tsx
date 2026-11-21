import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  Database,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  Cloud,
  ArrowRight,
} from 'lucide-react';
import { whatsappConfigService } from '../services/whatsappConfigService';
import { WhatsAppConfigData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SettingsPage: React.FC = () => {
  const [, setConfig] = useState<WhatsAppConfigData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [activeMode, setActiveMode] = useState<'PERSONAL_ASSISTED' | 'CLOUD_API'>('PERSONAL_ASSISTED');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [safetyDelay, setSafetyDelay] = useState<number>(3);

  // Cloud API states
  const [cloudEnabled, setCloudEnabled] = useState<boolean>(false);
  const [metaBusinessId, setMetaBusinessId] = useState<string>('');
  const [wabaId, setWabaId] = useState<string>('');
  const [phoneNumberId, setPhoneNumberId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState<string>('');
  const [apiVersion, setApiVersion] = useState<string>('v20.0');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await whatsappConfigService.getSettings();
      setConfig(data);
      setActiveMode(data.mode || 'PERSONAL_ASSISTED');

      if (data.personal) {
        setSenderPhone(data.personal.senderPhone || '');
        setAutoAdvance(data.personal.autoAdvanceOnSent ?? true);
        setSafetyDelay(data.personal.safetyDelaySeconds ?? 3);
      }

      if (data.cloudApi) {
        setCloudEnabled(data.cloudApi.isEnabled ?? false);
        setMetaBusinessId(data.cloudApi.metaBusinessAccountId || '');
        setWabaId(data.cloudApi.wabaId || '');
        setPhoneNumberId(data.cloudApi.phoneNumberId || '');
        setAccessToken(data.cloudApi.accessToken || '');
        setWebhookVerifyToken(data.cloudApi.webhookVerifyToken || '');
        setApiVersion(data.cloudApi.apiVersion || 'v20.0');
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      setSaving(true);
      const updated = await whatsappConfigService.updateSettings({
        mode: activeMode,
        personal: {
          accountType: 'PERSONAL',
          webUrlPrefix: 'https://wa.me',
          senderPhone: senderPhone.trim() || undefined,
          autoAdvanceOnSent: autoAdvance,
          safetyDelaySeconds: Number(safetyDelay),
        },
        cloudApi: {
          isEnabled: cloudEnabled,
          metaBusinessAccountId: metaBusinessId.trim() || undefined,
          wabaId: wabaId.trim() || undefined,
          phoneNumberId: phoneNumberId.trim() || undefined,
          accessToken: accessToken.trim() || undefined,
          webhookVerifyToken: webhookVerifyToken.trim() || undefined,
          apiVersion: apiVersion.trim() || 'v20.0',
        },
      } as any);

      setConfig(updated);
      setMessage({ type: 'success', text: 'WhatsApp Gateway configuration saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setMessage(null);
    try {
      setTesting(true);
      const res = await whatsappConfigService.testConnection(activeMode);
      setMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          System parameters, database connection details, and WhatsApp Gateway configuration.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">
              {message.type === 'success' ? 'Success' : 'Error'}
            </p>
            <p className="mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {/* Core Parameters */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Sliders className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">Application Parameters</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Base system configuration initialized in Module 1.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400">Environment:</span>
              <div className="text-slate-800 font-semibold mt-0.5">development</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400">Client Base URL:</span>
              <div className="text-slate-800 font-semibold mt-0.5">http://localhost:5173</div>
            </div>
          </div>
        </div>

        {/* Database Connection */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">Database Connection</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            MongoDB URI configured via server/.env configuration.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
            mongodb://localhost:27017/placement_automation
          </div>
        </div>

        {/* WhatsApp Gateway Provider Architecture */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">WhatsApp Gateway Configuration</h2>
                <p className="text-xs text-slate-500">
                  Switch between Personal WhatsApp assisted mode and official WhatsApp Cloud API.
                </p>
              </div>
            </div>

            <button
              onClick={loadSettings}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              title="Reload settings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dedicated Cloud API Gateway Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Official WhatsApp Business Cloud API &amp; Webhooks Hub
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Configure Meta App credentials, AES-256 encrypted secrets, 12-Step Setup Wizard, and webhook verification.
                    </p>
                  </div>
                </div>
                <Link
                  to="/whatsapp-cloud-settings"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs whitespace-nowrap shrink-0"
                >
                  <span>Open Cloud API Gateway</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Mode Selection Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setActiveMode('PERSONAL_ASSISTED')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    activeMode === 'PERSONAL_ASSISTED'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      A. Personal WhatsApp (Current Active Mode)
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Personal WhatsApp account with 1-click official wa.me chat links. Safe, verified, zero account suspension risk.
                  </p>
                </div>

                <div
                  onClick={() => setActiveMode('CLOUD_API')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    activeMode === 'CLOUD_API'
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      B. WhatsApp Cloud API (Future Mode)
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500">
                      Inactive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Meta WhatsApp Business Cloud API. Requires verified Meta Business Account, WABA ID & Access Token.
                  </p>
                </div>
              </div>

              {/* Personal WhatsApp Settings Details */}
              {activeMode === 'PERSONAL_ASSISTED' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700">
                      <p className="font-semibold text-slate-900">Personal Account Assisted Sending Rules</p>
                      <p className="text-slate-500 mt-0.5">
                        The administrator sends messages using an open session on WhatsApp Web or WhatsApp Desktop.
                        Our system generates prefilled links (wa.me/phone?text=...) ensuring compliance with WhatsApp policies.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Administrator Sender Phone (Optional Tracking)
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Recorded on manual confirmations for institutional auditing.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Safety Sending Delay (Seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={safetyDelay}
                        onChange={(e) => setSafetyDelay(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Advisory pacing throttle between consecutive chats.
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAdvance}
                          onChange={(e) => setAutoAdvance(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span>
                          Automatically advance to the next candidate upon manual sent confirmation
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Cloud API Settings Details */}
              {activeMode === 'CLOUD_API' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700">
                      <p className="font-semibold text-slate-900">Meta Business Cloud API Setup</p>
                      <p className="text-slate-500 mt-0.5">
                        These credentials will be activated once your institution finishes WhatsApp Business verification with Meta.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="enableCloud"
                      checked={cloudEnabled}
                      onChange={(e) => setCloudEnabled(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <label htmlFor="enableCloud" className="text-xs font-semibold text-slate-800">
                      Enable Cloud API Mode (Keep disabled while using Personal Account)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Meta Business Account ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 102938475610293"
                        value={metaBusinessId}
                        onChange={(e) => setMetaBusinessId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp Business Account ID (WABA ID)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 987654321098765"
                        value={wabaId}
                        onChange={(e) => setWabaId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 112233445566778"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Graph API Version
                      </label>
                      <input
                        type="text"
                        value={apiVersion}
                        onChange={(e) => setApiVersion(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        System User Permanent Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="EAABw..."
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {testing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test Connection Readiness</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
