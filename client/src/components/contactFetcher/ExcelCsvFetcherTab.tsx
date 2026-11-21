import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Users,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { previewSpreadsheet, parseSpreadsheet } from '../../services/contactFetcherService';
import {
  SpreadsheetPreviewData,
  SpreadsheetParsedData,
  ColumnMapping,
} from '../../types';
import { Badge } from '../common/Badge';

interface ExcelCsvFetcherTabProps {
  onAssignCandidates: (candidateIds: string[]) => void;
}

export const ExcelCsvFetcherTab: React.FC<ExcelCsvFetcherTabProps> = ({
  onAssignCandidates,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<SpreadsheetPreviewData | null>(null);

  // Column mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    fullName: '',
    phoneNumber: '',
    email: '',
    collegeName: '',
    degree: '',
    branch: '',
    passingYear: '',
    skills: '',
    experienceType: '',
    placementStatus: '',
    whatsappConsent: '',
  });

  // Selected sheet
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [autoCreateCandidates, setAutoCreateCandidates] = useState(true);

  // Parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<SpreadsheetParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview filtering & selection
  const [filterTab, setFilterTab] = useState<'ALL' | 'VALID_NEW' | 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | 'INVALID'>('ALL');
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<number[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsedData(null);
    setError(null);
    setSelectedRowNumbers([]);

    try {
      const preview = await previewSpreadsheet(file);
      setPreviewData(preview);
      setActiveSheet(preview.activeSheet);
      setMapping(preview.detectedMapping);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to inspect file');
    }
  };

  const handleSheetChange = async (sheet: string) => {
    if (!selectedFile) return;
    setActiveSheet(sheet);
    try {
      const preview = await previewSpreadsheet(selectedFile, sheet);
      setPreviewData(preview);
      setMapping(preview.detectedMapping);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to inspect selected sheet');
    }
  };

  const handleParse = async () => {
    if (!selectedFile || !mapping.fullName || !mapping.phoneNumber) {
      setError('Please map at least Full Name and Phone Number columns');
      return;
    }

    try {
      setIsParsing(true);
      setError(null);
      const res = await parseSpreadsheet(selectedFile, mapping, autoCreateCandidates, activeSheet);
      setParsedData(res);

      // By default, select all valid rows for assignment
      const selectableRowNums = res.rows
        .filter((r) => r.status === 'VALID_NEW' || r.status === 'EXISTING_IN_DB')
        .map((r) => r.rowNumber);
      setSelectedRowNumbers(selectableRowNums);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to parse spreadsheet');
    } finally {
      setIsParsing(false);
    }
  };

  const handleTriggerAssign = () => {
    if (!parsedData) return;

    // Collect candidate IDs from selected rows
    const candidateIds: string[] = [];
    for (const rowNum of selectedRowNumbers) {
      const r = parsedData.rows.find((row) => row.rowNumber === rowNum);
      if (r) {
        if (r.existingCandidateDbId) {
          candidateIds.push(r.existingCandidateDbId);
        } else if (r.existingCandidateId) {
          candidateIds.push(r.existingCandidateId);
        }
      }
    }

    if (candidateIds.length === 0) {
      alert('None of the selected rows have corresponding candidate records registered. Ensure "Register valid candidates" is checked when parsing.');
      return;
    }

    onAssignCandidates(candidateIds);
  };

  const filteredRows = parsedData
    ? filterTab === 'ALL'
      ? parsedData.rows
      : parsedData.rows.filter((r) => r.status === filterTab)
    : [];

  const toggleSelectAll = () => {
    if (!parsedData) return;
    const selectable = filteredRows
      .filter((r) => r.status === 'VALID_NEW' || r.status === 'EXISTING_IN_DB')
      .map((r) => r.rowNumber);

    const allSelected = selectable.every((num) => selectedRowNumbers.includes(num));
    if (allSelected) {
      setSelectedRowNumbers((prev) => prev.filter((num) => !selectable.includes(num)));
    } else {
      setSelectedRowNumbers((prev) => Array.from(new Set([...prev, ...selectable])));
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Upload Spreadsheet (Excel / CSV)
            </h3>
            <p className="text-xs text-slate-500">
              Supported formats: .xlsx, .xls, .csv. Automatic column detection with manual mapping.
            </p>
          </div>
          {selectedFile && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewData(null);
                setParsedData(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Reset File
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Click to browse or drag & drop spreadsheet file
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports student master lists, placement registration sheets, and contact logs
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-emerald-950">{selectedFile.name}</p>
                <p className="text-xs text-emerald-700">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {previewData?.totalRows || 0} rows found
                </p>
              </div>
            </div>

            {previewData && previewData.sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Sheet:</span>
                <select
                  value={activeSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-emerald-300 bg-white"
                >
                  {previewData.sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column Mapping Section */}
      {previewData && !parsedData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Map Column Headers</h4>
              <p className="text-xs text-slate-500">
                Confirm detected columns or map manually before parsing records.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {previewData.headers.length} Columns Detected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <select
                value={mapping.fullName}
                onChange={(e) => setMapping({ ...mapping, fullName: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Column --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile / Phone *</label>
              <select
                value={mapping.phoneNumber}
                onChange={(e) => setMapping({ ...mapping, phoneNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Column --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <select
                value={mapping.email}
                onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- None / Skip --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Degree */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Degree</label>
              <select
                value={mapping.degree}
                onChange={(e) => setMapping({ ...mapping, degree: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- None / Skip --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={mapping.branch}
                onChange={(e) => setMapping({ ...mapping, branch: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- None / Skip --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Passing Year */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Passing Year</label>
              <select
                value={mapping.passingYear}
                onChange={(e) => setMapping({ ...mapping, passingYear: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- None / Skip --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Skills */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Skills</label>
              <select
                value={mapping.skills}
                onChange={(e) => setMapping({ ...mapping, skills: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- None / Skip --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* College */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">College Name</label>
              <select
                value={mapping.collegeName}
                onChange={(e) => setMapping({ ...mapping, collegeName: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- None / Skip --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* WhatsApp Consent */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp Consent</label>
              <select
                value={mapping.whatsappConsent}
                onChange={(e) => setMapping({ ...mapping, whatsappConsent: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- None (Defaults to False) --</option>
                {previewData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="autoCreateCheck"
                checked={autoCreateCandidates}
                onChange={(e) => setAutoCreateCandidates(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoCreateCheck" className="text-slate-700 font-medium cursor-pointer">
                Automatically register valid new candidates into Candidate Database during parse
              </label>
            </div>

            <button
              onClick={handleParse}
              disabled={isParsing || !mapping.fullName || !mapping.phoneNumber}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors w-full sm:w-auto justify-center"
            >
              {isParsing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Parse & Preview Records ({previewData.totalRows})
            </button>
          </div>
        </div>
      )}

      {/* Parse Results & Action Toolbar */}
      {parsedData && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={() => setFilterTab('ALL')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                filterTab === 'ALL'
                  ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">Total Rows</span>
              <span className="text-xl font-bold text-slate-900">{parsedData.totalRows}</span>
            </div>

            <div
              onClick={() => setFilterTab('VALID_NEW')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                filterTab === 'VALID_NEW'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-emerald-600 block">Valid New</span>
              <span className="text-xl font-bold text-emerald-700">{parsedData.validNewCount}</span>
            </div>

            <div
              onClick={() => setFilterTab('EXISTING_IN_DB')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                filterTab === 'EXISTING_IN_DB'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-blue-600 block">In Database</span>
              <span className="text-xl font-bold text-blue-700">{parsedData.existingInDbCount}</span>
            </div>

            <div
              onClick={() => setFilterTab('DUPLICATE_IN_FILE')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                filterTab === 'DUPLICATE_IN_FILE'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-amber-600 block">Duplicate Phone</span>
              <span className="text-xl font-bold text-amber-700">{parsedData.duplicateInFileCount}</span>
            </div>

            <div
              onClick={() => setFilterTab('INVALID')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                filterTab === 'INVALID'
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-red-600 block">Invalid</span>
              <span className="text-xl font-bold text-red-700">{parsedData.invalidCount}</span>
            </div>
          </div>

          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Select / Deselect Visible
              </button>
              <span className="text-xs text-slate-500 font-medium">
                {selectedRowNumbers.length} records selected for assignment
              </span>
            </div>

            <button
              onClick={handleTriggerAssign}
              disabled={selectedRowNumbers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-40 transition-colors"
            >
              <Users className="w-4 h-4" />
              Assign Selected ({selectedRowNumbers.length}) to Virtual Group
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 uppercase font-semibold text-slate-500 border-b border-slate-200 sticky top-0 z-10 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Phone Number</th>
                    <th className="py-2.5 px-3">Degree & Branch</th>
                    <th className="py-2.5 px-3">Passing Year</th>
                    <th className="py-2.5 px-3">WhatsApp Consent</th>
                    <th className="py-2.5 px-3">Notes / Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((r) => {
                    const isSelectable = r.status === 'VALID_NEW' || r.status === 'EXISTING_IN_DB';
                    const isChecked = selectedRowNumbers.includes(r.rowNumber);
                    return (
                      <tr
                        key={r.rowNumber}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isChecked ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!isSelectable}
                            checked={isChecked}
                            onChange={() => {
                              setSelectedRowNumbers((prev) =>
                                isChecked
                                  ? prev.filter((n) => n !== r.rowNumber)
                                  : [...prev, r.rowNumber]
                              );
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">#{r.rowNumber}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {r.status === 'VALID_NEW' && <Badge variant="success">New Valid</Badge>}
                          {r.status === 'EXISTING_IN_DB' && <Badge variant="info">In Database</Badge>}
                          {r.status === 'DUPLICATE_IN_FILE' && <Badge variant="warning">Duplicate</Badge>}
                          {r.status === 'INVALID' && <Badge variant="danger">Invalid</Badge>}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {r.mapped.fullName}
                          {r.existingCandidateId && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {r.existingCandidateId}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {r.mapped.normalizedPhoneNumber || r.mapped.phoneNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.mapped.degree || 'N/A'} {r.mapped.branch ? `• ${r.mapped.branch}` : ''}
                        </td>
                        <td className="py-2.5 px-3">{r.mapped.passingYear || 'N/A'}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {r.mapped.whatsappConsent ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                              Consented
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                              No Consent
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {r.errors.length > 0 ? (
                            <span className="text-red-600 font-medium">{r.errors.join('; ')}</span>
                          ) : r.existingCandidateId ? (
                            <span className="text-blue-600">Existing candidate record linked</span>
                          ) : (
                            <span className="text-slate-400">Ready for assignment</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
