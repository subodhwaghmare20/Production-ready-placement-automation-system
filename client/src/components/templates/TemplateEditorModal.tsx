import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Smile,
  RotateCcw,
  RotateCw,
  Search,
  BookOpen,
  Lock,
} from 'lucide-react';
import { MessageTemplate, PlaceholderDefinition } from '../../types';
import { templateService } from '../../services/templateService';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  templateToEdit?: MessageTemplate | null;
}

const CATEGORIES = [
  { value: 'JOB_OPPORTUNITY', label: 'Job Opportunity' },
  { value: 'INTERVIEW_INVITATION', label: 'Interview Invitation' },
  { value: 'INTERVIEW_REMINDER', label: 'Interview Reminder' },
  { value: 'SHORTLISTED', label: 'Shortlisted Notification' },
  { value: 'REJECTED', label: 'Rejected Notification' },
  { value: 'PLACEMENT_CONFIRMATION', label: 'Placement Confirmation & Offer' },
  { value: 'DOCUMENT_REQUEST', label: 'Document Request' },
  { value: 'GENERAL_ANNOUNCEMENT', label: 'General Announcement' },
  { value: 'CUSTOM', label: 'Custom' },
];

const LANGUAGES = ['English', 'Hindi', 'Regional'];

const QUICK_EMOJIS = ['📅', '⏰', '📍', '🎉', '🎊', '💼', '🚀', '⭐', '👉', '⚠️', '✅', '👋'];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  templateToEdit,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('JOB_OPPORTUNITY');
  const [language, setLanguage] = useState('English');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Draft'>('Active');

  // Placeholder reference state
  const [placeholders, setPlaceholders] = useState<PlaceholderDefinition[]>([]);
  const [placeholderSearch, setPlaceholderSearch] = useState('');
  const [selectedPlaceholderCategory, setSelectedPlaceholderCategory] = useState<string>('ALL');

  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Live validation & preview state
  const [validation, setValidation] = useState<{
    validPlaceholders: string[];
    invalidPlaceholders: string[];
    isClean: boolean;
  }>({ validPlaceholders: [], invalidPlaceholders: [], isClean: true });

  const [previewText, setPreviewText] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load placeholders dictionary
  useEffect(() => {
    const fetchPlaceholders = async () => {
      try {
        const list = await templateService.getPlaceholders();
        setPlaceholders(list);
      } catch (err) {
        console.error('Failed to load placeholders:', err);
      }
    };
    fetchPlaceholders();
  }, []);

  // Initialize form when templateToEdit changes
  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setSubject(templateToEdit.subject || '');
      setCategory(templateToEdit.category);
      setLanguage(templateToEdit.language || 'English');
      setDescription(templateToEdit.description || '');
      setContent(templateToEdit.content);
      setStatus(templateToEdit.status || (templateToEdit.isActive ? 'Active' : 'Inactive'));
      setHistory([templateToEdit.content]);
      setHistoryIndex(0);
    } else {
      setName('');
      setSubject('');
      setCategory('JOB_OPPORTUNITY');
      setLanguage('English');
      setDescription('');
      const defaultContent =
        'Dear {{candidateFirstName}},\n\nWe have an exciting opportunity from {{companyName}} for the position of {{jobRole}} ({{jobLocation}}).\n\nSalary: {{salaryPackage}}\nWork Mode: {{workMode}}\n\nRegards,\n{{adminName}}';
      setContent(defaultContent);
      setStatus('Active');
      setHistory([defaultContent]);
      setHistoryIndex(0);
    }
    setErrorMsg(null);
  }, [templateToEdit, isOpen]);

  // Real-time validation & preview debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!content) {
        setPreviewText('');
        setValidation({ validPlaceholders: [], invalidPlaceholders: [], isClean: true });
        setMissingFields([]);
        return;
      }

      try {
        const [valRes, prevRes] = await Promise.all([
          templateService.validateTemplate(content),
          templateService.previewTemplate(content),
        ]);
        setValidation(valRes);
        setPreviewText(prevRes.personalizedMessage);
        setMissingFields(prevRes.missingFields || []);
      } catch (err) {
        console.error('Live preview error:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [content]);

  if (!isOpen) return null;

  const handleContentChange = (newText: string) => {
    setContent(newText);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newText);
    if (newHistory.length > 30) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setContent(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setContent(next);
    }
  };

  const handleInsertTag = (tag: string) => {
    handleContentChange(`${content} ${tag}`);
  };

  const handleInsertEmoji = (emoji: string) => {
    handleContentChange(`${content}${emoji}`);
  };

  const handleSave = async (asDraft: boolean = false) => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Template name is required.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Message body cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        subject: subject.trim() || undefined,
        category: category as any,
        language,
        description: description.trim() || undefined,
        content: content.trim(),
        status: asDraft ? ('Draft' as const) : status,
      };

      if (templateToEdit?._id) {
        await templateService.updateTemplate(templateToEdit._id, payload);
      } else {
        await templateService.createTemplate(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlaceholders = placeholders.filter((p) => {
    const matchesSearch =
      p.label.toLowerCase().includes(placeholderSearch.toLowerCase()) ||
      p.tag.toLowerCase().includes(placeholderSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(placeholderSearch.toLowerCase());
    const matchesCategory =
      selectedPlaceholderCategory === 'ALL' || p.category === selectedPlaceholderCategory;
    return matchesSearch && matchesCategory;
  });

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content ? content.split('\n').length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {templateToEdit ? 'Edit Message Template' : 'Create Advanced Template'}
                </h2>
                {templateToEdit?.isPredefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                    <Lock className="w-2.5 h-2.5" /> Predefined Blueprint
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Craft reusable message blueprints with dynamic student, company, and drive merge tags.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3-Panel Main Work Area */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden divide-x divide-slate-200">
          {/* LEFT PANEL: Metadata & Placeholder Dictionary (3 cols) */}
          <div className="col-span-12 lg:col-span-3 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
            <div>
              <span className="text-xs font-bold text-slate-900 block mb-2">
                Template Configuration
              </span>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Technical Round Shortlist"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Internal Subject / Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shortlist Announcement"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description for placement coordinators..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Placeholder Reference Box */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Insert Placeholders</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to insert</span>
              </div>

              {/* Search Placeholders */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={placeholderSearch}
                  onChange={(e) => setPlaceholderSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-[11px] rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['ALL', 'Candidate', 'Company', 'Interview', 'Administrative'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedPlaceholderCategory(cat)}
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      selectedPlaceholderCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Placeholder List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredPlaceholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleInsertTag(p.tag)}
                    className="w-full text-left p-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg text-xs group transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-800 group-hover:text-emerald-700">
                        {p.tag}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-medium">
                        {p.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER PANEL: Large Message Editor (5 cols) */}
          <div className="col-span-12 lg:col-span-5 p-5 flex flex-col justify-between bg-white overflow-y-auto">
            <div className="space-y-3 flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-900">Message Body</span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                    <button
                      type="button"
                      disabled={historyIndex <= 0}
                      onClick={handleUndo}
                      title="Undo (Ctrl+Z)"
                      className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={historyIndex >= history.length - 1}
                      onClick={handleRedo}
                      title="Redo"
                      className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 border-l border-slate-200"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {content.length} chars • {wordCount} words
                  </span>
                </div>
              </div>

              {/* Emoji quick-insert row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Smile className="w-3 h-3" /> Emoji:
                </span>
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleInsertEmoji(em)}
                    className="p-1 hover:bg-slate-100 rounded text-xs transition-colors"
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                required
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Type your WhatsApp message blueprint here..."
                className="flex-1 w-full p-4 font-mono text-xs leading-relaxed rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[300px]"
              />

              {/* Quick tags bar */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  '{{candidateFirstName}}',
                  '{{companyName}}',
                  '{{jobRole}}',
                  '{{interviewDate}}',
                  '{{interviewTime}}',
                  '{{interviewLocation}}',
                ].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleInsertTag(t)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-[10px] font-mono text-slate-700 border border-slate-200"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Supports multiple paragraphs & line breaks.</span>
              <span>{lineCount} lines</span>
            </div>
          </div>

          {/* RIGHT PANEL: Live Preview & Validation Results (4 cols) */}
          <div className="col-span-12 lg:col-span-4 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
            {/* Validation Feedback */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Syntax & Spelling Check</span>
                {validation.isClean ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Valid Tags
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Invalid Placeholders
                  </span>
                )}
              </div>

              {/* Invalid tags error list */}
              {validation.invalidPlaceholders.length > 0 && (
                <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 space-y-1">
                  <span className="text-[11px] font-bold text-red-800 block">
                    Misspelled or unsupported merge tags:
                  </span>
                  {validation.invalidPlaceholders.map((inv) => (
                    <div key={inv} className="text-[10px] font-mono text-red-700">
                      • {`{{${inv}}}`}
                    </div>
                  ))}
                  <p className="text-[10px] text-red-600 mt-1">
                    Please correct spelling using the available placeholder dictionary on the left.
                  </p>
                </div>
              )}

              {/* Valid tags pill list */}
              {validation.validPlaceholders.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Detected valid tags ({validation.validPlaceholders.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {validation.validPlaceholders.map((v) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live WhatsApp Simulation Bubble */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Live Recipient Preview
                </span>
                <span className="text-[10px] text-slate-400">Sample Candidate Simulation</span>
              </div>

              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                <div className="bg-emerald-50 text-slate-900 p-3.5 rounded-lg rounded-tr-none shadow-xs text-xs whitespace-pre-wrap leading-relaxed border border-emerald-100 font-sans">
                  {previewText || 'Start typing in the editor to see rendered preview...'}
                  <div className="text-[10px] text-slate-400 text-right mt-2 flex items-center justify-end gap-1 font-mono">
                    <span>10:30 AM</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {missingFields.length > 0 && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] space-y-1">
                  <span className="font-semibold block">Missing fields in preview:</span>
                  <div className="flex flex-wrap gap-1">
                    {missingFields.map((mf) => (
                      <span key={mf} className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-mono text-[10px]">
                        {mf}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700">
                    The system will alert administrators before campaigns dispatch if a candidate record lacks these fields.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving || !validation.isClean}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
              <span>{templateToEdit ? 'Save Changes' : 'Save & Publish Template'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
