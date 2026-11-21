import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Copy,
  Download,
  Upload,
  Search,
  Sparkles,
  Check,
} from 'lucide-react';
import { templateService } from '../services/templateService';
import { MessageTemplate } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { TemplateEditorModal } from '../components/templates/TemplateEditorModal';
import { TemplateImportModal } from '../components/templates/TemplateImportModal';

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: 'All Categories' },
  { key: 'JOB_OPPORTUNITY', label: 'Job Opportunity' },
  { key: 'INTERVIEW_INVITATION', label: 'Interview Invitation' },
  { key: 'INTERVIEW_REMINDER', label: 'Interview Reminder' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'PLACEMENT_CONFIRMATION', label: 'Placement Confirmation' },
  { key: 'DOCUMENT_REQUEST', label: 'Document Request' },
  { key: 'GENERAL_ANNOUNCEMENT', label: 'General Announcement' },
  { key: 'CUSTOM', label: 'Custom' },
];

export const MessageTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await templateService.getTemplates({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        language: languageFilter !== 'ALL' ? languageFilter : undefined,
        search: search.trim() || undefined,
      });
      setTemplates(res);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter, statusFilter, languageFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTemplates();
  };

  const handleDuplicate = async (id: string) => {
    try {
      await templateService.duplicateTemplate(id);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate template');
    }
  };

  const handleDelete = async (id: string, isPredefined: boolean) => {
    if (isPredefined) {
      alert('Standard institutional templates cannot be deleted.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this custom template?')) return;

    try {
      await templateService.deleteTemplate(id);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const handleCopyContent = (t: MessageTemplate) => {
    navigator.clipboard.writeText(t.content);
    setCopiedId(t._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = async () => {
    try {
      const data = await templateService.exportTemplates();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `placement-message-templates-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Message Templates & Personalization
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Module 8 Advanced
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic communication blueprints with candidate, company, and drive merge tags, spelling validation, and live preview.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export JSON
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Import JSON
          </button>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Advanced Template
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === c.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Draft">Draft</option>
            </select>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Search
            </button>
          </form>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FileCode2}
            title="No templates found"
            description="Create your first message blueprint using the 3-panel advanced editor."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {templates.map((tmpl) => (
              <div
                key={tmpl._id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {tmpl.name}
                        </h3>
                        {tmpl.isPredefined ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            <Lock className="w-2.5 h-2.5" /> Blueprint
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Custom
                          </span>
                        )}
                        {tmpl.status === 'Draft' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">
                        {tmpl.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyContent(tmpl)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Copy message content"
                      >
                        {copiedId === tmpl._id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDuplicate(tmpl._id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Duplicate template"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTemplate(tmpl);
                          setIsEditorOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Edit in 3-panel editor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!tmpl.isPredefined && (
                        <button
                          onClick={() => handleDelete(tmpl._id, tmpl.isPredefined)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {tmpl.subject && (
                    <div className="text-[11px] text-slate-500 font-medium">
                      Subject: {tmpl.subject}
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {tmpl.content}
                  </div>

                  {/* Merge Tags Chips */}
                  {tmpl.placeholders && tmpl.placeholders.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tmpl.placeholders.slice(0, 4).map((ph) => (
                        <span
                          key={ph}
                          className="px-1.5 py-0.5 bg-slate-200/60 text-slate-700 rounded text-[10px] font-mono"
                        >
                          {`{{${ph}}}`}
                        </span>
                      ))}
                      {tmpl.placeholders.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{tmpl.placeholders.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Usage: {tmpl.usageCount || 0} drives</span>
                  <span>{tmpl.language || 'English'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={loadTemplates}
        templateToEdit={editingTemplate}
      />

      <TemplateImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={loadTemplates}
      />
    </div>
  );
};
