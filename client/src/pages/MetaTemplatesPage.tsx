import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Info,
  Search,
} from 'lucide-react';
import { cloudApiService } from '../services/cloudApiService';
import { MetaTemplate, MetaTemplateStatus } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const MetaTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await cloudApiService.getMetaTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await cloudApiService.syncMetaTemplates();
      setTemplates(res.templates);
      if (res.templates.length > 0) {
        setSelectedTemplate(res.templates[0]);
      }
      setMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to sync templates from Meta' });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: MetaTemplateStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.components.some((c) => c.text?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Official Meta Message Templates
              </h1>
              <p className="text-sm text-slate-500">
                Pre-approved templates synchronized directly from Meta WhatsApp Business Account
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing from Meta...' : 'Sync from Meta'}
          </button>
        </div>
      </div>

      {/* Message Banner */}
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

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-700">
        <Info className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <span className="font-bold">Official Meta Policy: </span>
          WhatsApp Cloud API automated messages must use pre-approved templates. Free-form text is restricted to active 24-hour customer service windows. Only <strong>APPROVED</strong> templates are eligible for automated placement campaigns.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid: Template List + Template Inspector */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileCode2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Meta Templates Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Click "Sync from Meta" to import approved templates from your WhatsApp Business Account, or create templates in Meta WhatsApp Manager.
          </p>
          <button
            type="button"
            onClick={handleSync}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" /> Sync Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Template List */}
          <div className="lg:col-span-5 space-y-3">
            {filteredTemplates.map((tmpl) => {
              const isSelected = selectedTemplate?._id === tmpl._id;
              const bodyText = tmpl.components.find((c) => c.type === 'BODY')?.text || '';

              return (
                <div
                  key={tmpl._id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{tmpl.name}</h4>
                    {getStatusBadge(tmpl.status)}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                      {tmpl.category}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{tmpl.language}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed font-sans">
                    {bodyText}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Template Inspector Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-6">
            {selectedTemplate ? (
              <>
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedTemplate.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-mono">ID: {selectedTemplate.metaTemplateId}</span>
                      <span>•</span>
                      <span>Category: {selectedTemplate.category}</span>
                      <span>•</span>
                      <span>Language: {selectedTemplate.language}</span>
                    </div>
                  </div>
                  {getStatusBadge(selectedTemplate.status)}
                </div>

                {/* Simulated WhatsApp Bubble Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    WhatsApp Bubble Preview
                  </span>
                  <div className="bg-[#EFEAE2] p-4 rounded-xl border border-slate-200 flex justify-end">
                    <div className="bg-[#D9FDD3] rounded-2xl rounded-tr-xs p-3.5 max-w-md shadow-xs text-slate-900 text-sm space-y-2">
                      {/* Header */}
                      {selectedTemplate.components.find((c) => c.type === 'HEADER') && (
                        <div className="font-bold text-xs text-slate-800 pb-1 border-b border-emerald-200">
                          {selectedTemplate.components.find((c) => c.type === 'HEADER')?.text}
                        </div>
                      )}

                      {/* Body */}
                      <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                        {selectedTemplate.components.find((c) => c.type === 'BODY')?.text}
                      </p>

                      {/* Footer */}
                      {selectedTemplate.components.find((c) => c.type === 'FOOTER') && (
                        <div className="text-[11px] text-slate-500 pt-1">
                          {selectedTemplate.components.find((c) => c.type === 'FOOTER')?.text}
                        </div>
                      )}

                      {/* Buttons */}
                      {selectedTemplate.components.find((c) => c.type === 'BUTTONS')?.buttons && (
                        <div className="pt-2 border-t border-emerald-200 space-y-1">
                          {selectedTemplate.components
                            .find((c) => c.type === 'BUTTONS')
                            ?.buttons?.map((b, idx) => (
                              <div
                                key={idx}
                                className="w-full text-center py-1.5 rounded-lg bg-white/70 hover:bg-white text-blue-600 font-semibold text-xs shadow-2xs"
                              >
                                {b.text}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Parameter Mappings */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Candidate Field Parameter Mappings
                  </span>
                  {selectedTemplate.parameterMappings && selectedTemplate.parameterMappings.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Placeholder</th>
                            <th className="py-2.5 px-3">Variable Meaning</th>
                            <th className="py-2.5 px-3">Mapped Candidate Property</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedTemplate.parameterMappings.map((m) => (
                            <tr key={m.index} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono text-indigo-600 font-bold">
                                {`{{${m.index}}}`}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {m.parameterName}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 bg-slate-50/50">
                                {m.candidateField}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No parameters in this template (static text).
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                Select a template from the left to view details.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
