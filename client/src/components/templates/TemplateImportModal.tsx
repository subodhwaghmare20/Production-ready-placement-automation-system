import React, { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { templateService } from '../../services/templateService';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export const TemplateImportModal: React.FC<TemplateImportModalProps> = ({
  isOpen,
  onClose,
  onImported,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        parseAndPreview(text);
      } catch {
        setErrorMsg('Failed to read file as text.');
      }
    };
    reader.readAsText(file);
  };

  const parseAndPreview = (text: string) => {
    setErrorMsg(null);
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : data?.templates;
      if (!Array.isArray(items)) {
        throw new Error('JSON must contain a top-level array of templates or a "templates" key.');
      }
      setParsedPreview(items);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid JSON syntax');
      setParsedPreview(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) {
      setErrorMsg('No valid templates found to import.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await templateService.importTemplates(parsedPreview, overwrite);
      setResultMsg(`Successfully imported ${res.importedCount} templates (${res.skippedCount} skipped).`);
      setTimeout(() => {
        onImported();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Import Message Templates (JSON)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resultMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resultMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Upload Template JSON File
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Or Paste JSON Directly
          </label>
          <textarea
            rows={5}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              parseAndPreview(e.target.value);
            }}
            placeholder='[ { "name": "Drive Invite", "category": "JOB_OPPORTUNITY", "content": "..." } ]'
            className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {parsedPreview && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Parsed Templates Preview ({parsedPreview.length} found):
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {parsedPreview.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-white rounded border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{item.name || 'Untitled'}</span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      ({item.category || 'NO_CATEGORY'})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.content ? `${item.content.length} chars` : 'Empty'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Overwrite existing custom templates if names match identically</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !parsedPreview || parsedPreview.length === 0}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs"
          >
            {loading ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />}
            <span>Import Templates</span>
          </button>
        </div>
      </div>
    </div>
  );
};
