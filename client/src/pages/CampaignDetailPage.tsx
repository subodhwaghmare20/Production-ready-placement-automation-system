import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Layers,
  History,
  Users,
  Clock,
  User,
} from 'lucide-react';
import { campaignService } from '../services/campaignService';
import { analyticsService } from '../services/analyticsService';
import { WhatsAppCampaign, CampaignRecipient, CampaignActivity } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<WhatsAppCampaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [totalRecipients, setTotalRecipients] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // Module 9: Tabs & Timeline
  const [activeTab, setActiveTab] = useState<'recipients' | 'timeline'>('recipients');
  const [timeline, setTimeline] = useState<CampaignActivity[]>([]);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [campData, recRes] = await Promise.all([
        campaignService.getCampaignById(id),
        campaignService.getCampaignRecipients(id, statusFilter, page, 50),
      ]);
      setCampaign(campData);
      setRecipients(recRes.recipients);
      setTotalRecipients(recRes.total);
    } catch (err) {
      console.error('Failed to load campaign audit details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async () => {
    if (!id) return;
    try {
      setTimelineLoading(true);
      const res = await analyticsService.getCampaignTimeline(id, { limit: 50 });
      setTimeline(res.activities);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, statusFilter, page]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      loadTimeline();
    }
  }, [activeTab, id]);

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT_MANUALLY_CONFIRMED':
        return <Badge variant="success">Confirmed Sent</Badge>;
      case 'CHAT_OPENED':
        return <Badge variant="warning">Chat Opened</Badge>;
      case 'SKIPPED':
        return <Badge variant="default">Skipped</Badge>;
      case 'FAILED_TO_OPEN':
        return <Badge variant="danger">Failed to Open</Badge>;
      case 'READY':
      case 'PENDING':
        return <Badge variant="info">Ready in Queue</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'CAMPAIGN_CREATED':
      case 'RECIPIENTS_PREPARED':
        return <Badge variant="info">{eventType.replace('_', ' ')}</Badge>;
      case 'CAMPAIGN_STARTED':
      case 'CHAT_OPENED':
        return <Badge variant="warning">{eventType.replace('_', ' ')}</Badge>;
      case 'MESSAGE_MANUALLY_CONFIRMED':
      case 'CAMPAIGN_COMPLETED':
        return <Badge variant="success">{eventType.replace('_', ' ')}</Badge>;
      case 'RECIPIENT_SKIPPED':
      case 'CHAT_OPENING_FAILED':
      case 'CAMPAIGN_CANCELLED':
        return <Badge variant="danger">{eventType.replace('_', ' ')}</Badge>;
      default:
        return <Badge variant="default">{eventType.replace('_', ' ')}</Badge>;
    }
  };

  if (loading && !campaign) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Campaign not found.</p>
        <Link to="/whatsapp-messages" className="text-xs text-emerald-600 mt-2 inline-block">
          Return to Campaigns
        </Link>
      </div>
    );
  }

  const company = typeof campaign.companyId === 'object' ? campaign.companyId : null;
  const group = typeof campaign.groupId === 'object' ? campaign.groupId : null;
  const confirmed = campaign.metrics?.manuallyConfirmedCount || 0;
  const eligible = campaign.metrics?.eligibleRecipients || 0;
  const progressPct = eligible > 0 ? Math.round((confirmed / eligible) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/whatsapp-messages"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {campaign.name}
              </h1>
              <span className="text-xs font-mono text-slate-500">{campaign.campaignId}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Recruitment Drive Campaign Audit & Compliance Records
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/campaign-comparison"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Compare</span>
          </Link>

          <Link
            to={`/whatsapp-messages/${campaign._id}/validation`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Personalization Hub</span>
          </Link>

          {campaign.status !== 'COMPLETED' && campaign.status !== 'CANCELLED' && (
            <Link
              to={`/whatsapp-messages/${campaign._id}/process`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Dispatch</span>
            </Link>
          )}

          <button
            onClick={() => {
              loadData();
              if (activeTab === 'timeline') loadTimeline();
            }}
            className="p-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs"
            title="Refresh Audit Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Campaign Details Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
            Drive Profile
          </span>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Company:</span>
              <span className="font-semibold text-slate-800">{company?.companyName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Target Job Role:</span>
              <span className="text-slate-700">{campaign.metadata?.customJobRole || company?.jobRole || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Virtual Group:</span>
              <span className="text-slate-700">{group?.groupName || 'Primary Virtual Group'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
            Schedule & Venue
          </span>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Interview Date & Time:</span>
              <span className="text-slate-700">
                {campaign.metadata?.interviewDate || 'Not specified'} • {campaign.metadata?.interviewTime || 'TBD'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Location / Link:</span>
              <span className="text-slate-700">{campaign.metadata?.interviewLocation || 'To be notified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Created By Admin:</span>
              <span className="text-slate-700">{campaign.createdBy?.name || 'Administrator'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
            Dispatch Metrics
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Confirmed Sent:</span>
              <span className="font-bold text-emerald-600">{confirmed} / {eligible}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Skipped:</span>
              <span className="font-semibold text-slate-700">{campaign.metrics?.skippedCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Chat Opened:</span>
              <span className="font-semibold text-amber-600">{campaign.metrics?.chatOpenedCount || 0}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Recipients vs Timeline */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('recipients')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'recipients'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Recipients Audit Log ({totalRecipients})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Activity Timeline ({timeline.length})</span>
        </button>
      </div>

      {/* TAB 1: Recipient Audit Log Table */}
      {activeTab === 'recipients' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Candidate Recipient Records
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time audit log of assisted messages dispatched, opened, and confirmed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'SENT_MANUALLY_CONFIRMED', 'CHAT_OPENED', 'READY', 'SKIPPED', 'FAILED_TO_OPEN'].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'All'
                      : st === 'SENT_MANUALLY_CONFIRMED'
                      ? 'Confirmed'
                      : st === 'CHAT_OPENED'
                      ? 'Opened'
                      : st === 'FAILED_TO_OPEN'
                      ? 'Failed'
                      : st}
                  </button>
                )
              )}
            </div>
          </div>

          {recipients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No recipients found matching current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/50">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Personalized Message Preview</th>
                    <th className="py-3 px-3">Activity Log</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipients.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {rec.queueOrder}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{rec.candidateName}</div>
                        {typeof rec.candidateId === 'object' && rec.candidateId && (
                          <div className="text-[11px] text-slate-400">
                            {rec.candidateId.branch || rec.candidateId.collegeName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700">
                        {rec.normalizedPhoneNumber}
                      </td>

                      <td className="py-3 px-3">{getRecipientStatusBadge(rec.status)}</td>

                      <td className="py-3 px-3 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 text-[11px]">
                          {rec.personalizedMessage}
                        </p>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {rec.manuallyConfirmedAt && (
                          <div>Sent: {new Date(rec.manuallyConfirmedAt).toLocaleTimeString()}</div>
                        )}
                        {rec.chatOpenedAt && !rec.manuallyConfirmedAt && (
                          <div>Opened: {new Date(rec.chatOpenedAt).toLocaleTimeString()}</div>
                        )}
                        {rec.skippedAt && (
                          <div className="text-amber-700">Skipped: {rec.skipReason}</div>
                        )}
                        {rec.errorDetails && (
                          <div className="text-rose-600">Failed: {rec.errorDetails}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <a
                          href={rec.clickToChatUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md"
                        >
                          <ExternalLink className="w-3 h-3" />
                          wa.me link
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Activity Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Chronological Campaign Audit Trail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable timeline recording lifecycle milestones, chat openings, and administrative decisions.
            </p>
          </div>

          {timelineLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No activity events recorded yet.
            </div>
          ) : (
            <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((act) => (
                <div key={act._id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-8 top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow-xs group-hover:scale-125 transition-transform" />

                  <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2">
                        {getEventBadge(act.eventType)}
                        {act.candidateName && (
                          <span className="text-xs font-semibold text-slate-800">
                            {act.candidateName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {act.description}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Action Performed By: {act.performedByName || 'Administrator'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
