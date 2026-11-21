import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileDown,
} from 'lucide-react';
import {
  downloadSampleTemplate,
  previewBulkImport,
  confirmBulkImport,
  exportRejectedReport,
} from '../../services/candidateService';
import { BulkImportPreviewData, BulkImportConfirmResult } from '../../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<BulkImportPreviewData | null>(null);
  const [importResult, setImportResult] = useState<BulkImportConfirmResult | null>(null);
  const [activeTab, setActiveTab] = useState<'valid' | 'rejected'>('valid');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) {
      setError('Please choose an Excel or CSV file to upload.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await previewBulkImport(file);
      setPreviewData(data);
      setStep('preview');
      setActiveTab(data.summary.validCount > 0 ? 'valid' : 'rejected');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process spreadsheet file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.validRecords.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await confirmBulkImport(previewData.validRecords);
      setImportResult(result);
      setStep('completed');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete candidate import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSample = async (format: 'xlsx' | 'csv') => {
    try {
      await downloadSampleTemplate(format);
    } catch {
      setError('Failed to download sample template.');
    }
  };

  const handleExportRejected = async () => {
    if (!previewData || previewData.rejectedRecords.length === 0) return;
    try {
      await exportRejectedReport(previewData.rejectedRecords);
    } catch {
      setError('Failed to export rejection report.');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bulk Candidate Import</h2>
              <p className="text-xs text-slate-500">
                Import candidates from Excel (.xlsx, .xls) or CSV with batch validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="mt-6 space-y-6">
            {/* Download Sample Template Banner */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Download Template First</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use our sample template with pre-formatted column headers for optimal validation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSample('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Sample .XLSX
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSample('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Sample .CSV
                </button>
              </div>
            </div>

            {/* Upload Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                {file ? file.name : 'Choose a file or drag and drop'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: .xlsx, .xls, .csv (Max 20MB)
              </p>
              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs">
                <span>Browse File</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAndPreview}
                disabled={!file || isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing & Validating...</span>
                  </>
                ) : (
                  <span>Continue to Preview</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & REVIEW */}
        {step === 'preview' && previewData && (
          <div className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-medium text-slate-500">Total Rows Detected</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {previewData.summary.totalRows}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ready to Import
                </span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {previewData.summary.validCount}
                </p>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-xs font-medium text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Rejected / Duplicates
                </span>
                <p className="text-2xl font-bold text-rose-900 mt-1">
                  {previewData.summary.rejectedCount}
                </p>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center justify-between border-b border-slate-200">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('valid')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'valid'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Valid Records ({previewData.summary.validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rejected')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'rejected'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Rejected Rows ({previewData.summary.rejectedCount})
                </button>
              </div>

              {previewData.summary.rejectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleExportRejected}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 pb-2"
                >
                  <FileDown className="w-3.5 h-3.5" /> Download Rejected Report
                </button>
              )}
            </div>

            {/* Tab Content Table */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              {activeTab === 'valid' ? (
                previewData.validRecords.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Branch</th>
                        <th className="p-2.5">Consent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.validRecords.slice(0, 50).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-900">{r.fullName}</td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {r.normalizedPhoneNumber}
                          </td>
                          <td className="p-2.5 text-slate-500">{r.email || '—'}</td>
                          <td className="p-2.5 text-slate-600">{r.branch || '—'}</td>
                          <td className="p-2.5">
                            {r.whatsappConsent ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                Explicit Yes
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                No Consent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No valid records found in this spreadsheet.
                  </div>
                )
              ) : previewData.rejectedRecords.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50/50 text-rose-800 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-16">Row</th>
                      <th className="p-2.5">Reason for Rejection</th>
                      <th className="p-2.5">Provided Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.rejectedRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-rose-50/20">
                        <td className="p-2.5 font-mono text-slate-700">#{r.rowNumber}</td>
                        <td className="p-2.5 font-medium text-rose-600">{r.reason}</td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                          {JSON.stringify(r.data)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-emerald-600">
                  Zero rejected records! All rows passed validation.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Choose Another File
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={previewData.summary.validCount === 0 || isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <span>Proceed Import ({previewData.summary.validCount} Records)</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETED */}
        {step === 'completed' && importResult && (
          <div className="mt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Import Process Finished!</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Successfully inserted{' '}
              <span className="font-bold text-slate-900">
                {importResult.successfullyImported}
              </span>{' '}
              candidates into the centralized database.
            </p>

            <div className="pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
              >
                Close and View Candidates
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

