import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  LogOut,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Trash2,
  MapPin,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { AdminSessionData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SessionManagementPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminSessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState<boolean>(false);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getMySessions();
      setSessions(data || []);
    } catch (err: any) {
      console.error('Failed to fetch active sessions:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch sessions' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSingle = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await adminService.revokeSession(sessionId);
      setMessage({ type: 'success', text: 'Session successfully revoked and terminated.' });
      await fetchSessions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke session' });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      setRevokingAll(true);
      setShowRevokeAllModal(false);
      const res = await adminService.revokeAllOtherSessions();
      setMessage({
        type: 'success',
        text: `Successfully revoked ${res.revokedCount} other session(s). All other devices have been logged out.`,
      });
      await fetchSessions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke other sessions' });
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      case 'desktop':
      default:
        return <Laptop className="w-5 h-5" />;
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent && !s.isRevoked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Active Sessions & Devices</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Shield className="w-3 h-3" /> Real-time Control
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and manage your active web sessions across different browsers and devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSessions()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowRevokeAllModal(true)}
            disabled={revokingAll || otherSessionsCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Revoke All Other Sessions
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

      {/* Security Tip Box */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm">Security Recommendation</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            If you see any unfamiliar browser or location in your active session list, revoke that session immediately
            and update your account password from your profile settings.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-slate-400">
            Active Devices:{' '}
            <strong className="text-white font-mono">{sessions.filter((s) => !s.isRevoked).length}</strong>
          </span>
        </div>
      </div>

      {/* Session Cards Grid */}
      {loading ? (
        <div className="p-16 flex justify-center bg-white rounded-xl border border-slate-200">
          <LoadingSpinner size="lg" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          <Shield className="w-10 h-10 mx-auto mb-2 text-slate-400" />
          <p className="font-medium text-slate-800">No active sessions detected</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.sessionId || session._id}
              className={`bg-white rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                session.isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : session.isRevoked
                  ? 'border-slate-200 opacity-60 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        session.isCurrent
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {getDeviceIcon(session.device)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                        {session.browser || 'Web Browser'}
                        {session.isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Current
                          </span>
                        )}
                        {session.isRevoked && (
                          <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Revoked
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {session.os || 'Unknown OS'} • {session.device || 'Desktop'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> IP Address
                    </span>
                    <span className="font-mono text-slate-800">{session.ipAddress || '127.0.0.1'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Last Active
                    </span>
                    <span className="text-slate-700 font-medium">
                      {new Date(session.lastActive).toLocaleDateString()} at{' '}
                      {new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Session Key
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-[150px]">
                      {session.sessionId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                {session.isCurrent ? (
                  <div className="text-center py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg">
                    This is your active browser session
                  </div>
                ) : session.isRevoked ? (
                  <div className="text-center py-1.5 text-xs text-slate-400 font-medium bg-slate-100 rounded-lg">
                    Session Revoked
                  </div>
                ) : (
                  <button
                    onClick={() => handleRevokeSingle(session.sessionId)}
                    disabled={revokingId === session.sessionId}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {revokingId === session.sessionId ? 'Revoking...' : 'Revoke Session'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Revoke All Other Sessions */}
      {showRevokeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Revoke All Other Sessions?</h3>
                <p className="text-xs text-slate-500">This will terminate {otherSessionsCount} active login session(s).</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to sign out from all other browsers, mobile devices, and active workstations?
              Your current device will remain logged in.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRevokeAllModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeAllOther}
                disabled={revokingAll}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {revokingAll ? 'Revoking Sessions...' : 'Confirm Revoke All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
