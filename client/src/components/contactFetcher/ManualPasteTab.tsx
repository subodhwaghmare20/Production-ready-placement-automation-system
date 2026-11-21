import React, { useState } from 'react';
import {
  ClipboardPaste,
  Users,
  UserPlus,
  Loader2,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { validateNumbers, createFromUnknown } from '../../services/contactFetcherService';
import { ManualPasteValidationData } from '../../types';

interface ManualPasteTabProps {
  onAssignCandidates: (candidateIds: string[]) => void;
}

export const ManualPasteTab: React.FC<ManualPasteTabProps> = ({
  onAssignCandidates,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ManualPasteValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active view tab in results: 'existing' | 'unknown' | 'invalid'
  const [activeTab, setActiveTab] = useState<'existing' | 'unknown' | 'invalid'>('existing');

  // Candidate selection from matched
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Modal / form to register unknown number
  const [unknownToCreate, setUnknownToCreate] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    degree: '',
    branch: '',
    collegeName: '',
    passingYear: '',
    email: '',
    whatsappConsent: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!pasteText.trim()) {
      setError('Please paste or enter phone numbers to validate');
      return;
    }

    try {
      setIsValidating(true);
      setError(null);
      const res = await validateNumbers(pasteText);
      setValidationResult(res);

      // By default select all existing matched candidates
      setSelectedCandidateIds(res.existingCandidates.map((c) => c._id));
      if (res.existingCount === 0 && res.unknownCount > 0) {
        setActiveTab('unknown');
      } else {
        setActiveTab('existing');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process phone numbers');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateUnknown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unknownToCreate || !createForm.fullName.trim()) {
      setCreateError('Full name is required');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      const res = await createFromUnknown([
        {
          fullName: createForm.fullName.trim(),
          phoneNumber: unknownToCreate,
          degree: createForm.degree.trim(),
          branch: createForm.branch.trim(),
          collegeName: createForm.collegeName.trim(),
          passingYear: createForm.passingYear ? parseInt(createForm.passingYear, 10) : undefined,
          email: createForm.email.trim(),
          whatsappConsent: createForm.whatsappConsent,
          whatsappConsentSource: createForm.whatsappConsent ? 'Contact Fetcher Manual Creation' : '',
        },
      ]);

      if (res.created.length > 0) {
        const newCand = res.created[0];
        // Add to existing list and select it
        if (validationResult) {
          setValidationResult({
            ...validationResult,
            existingCount: validationResult.existingCount + 1,
            unknownCount: Math.max(0, validationResult.unknownCount - 1),
            existingCandidates: [newCand, ...validationResult.existingCandidates],
            unknownNumbers: validationResult.unknownNumbers.filter((n) => n !== unknownToCreate),
          });
        }
        setSelectedCandidateIds((prev) => [...prev, newCand._id]);
        setUnknownToCreate(null);
        setCreateForm({
          fullName: '',
          degree: '',
          branch: '',
          collegeName: '',
          passingYear: '',
          email: '',
          whatsappConsent: false,
        });
      } else if (res.failed.length > 0) {
        setCreateError(res.failed[0].reason);
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to register candidate');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Paste Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4 text-indigo-600" />
              Manual Contact Paste
            </h3>
            <p className="text-xs text-slate-500">
              Paste raw phone numbers separated by newlines, commas, or spaces (e.g. 9876543210, +919876543210).
            </p>
          </div>
          {pasteText && (
            <button
              onClick={() => {
                setPasteText('');
                setValidationResult(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Clear Text
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <textarea
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste contact numbers here. Examples:\n9876543210\n919876543211\n+919876543212, +919876543213`}
            className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-400">
              Numbers are automatically stripped of dashes/spaces and normalized to E.164. Duplicates within input are merged.
            </p>

            <button
              onClick={handleValidate}
              disabled={isValidating || !pasteText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors w-full sm:w-auto justify-center"
            >
              {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Extract & Validate Numbers
            </button>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">Total Extracted</span>
              <span className="text-xl font-bold text-slate-900">{validationResult.totalParsed}</span>
            </div>

            <div
              onClick={() => setActiveTab('existing')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeTab === 'existing'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-emerald-600 block">
                Found in Database
              </span>
              <span className="text-xl font-bold text-emerald-700">{validationResult.existingCount}</span>
            </div>

            <div
              onClick={() => setActiveTab('unknown')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeTab === 'unknown'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-amber-600 block">
                Unknown Numbers
              </span>
              <span className="text-xl font-bold text-amber-700">{validationResult.unknownCount}</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                Duplicates Merged
              </span>
              <span className="text-xl font-bold text-slate-600">{validationResult.duplicateCount}</span>
            </div>

            <div
              onClick={() => setActiveTab('invalid')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeTab === 'invalid'
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase text-rose-600 block">
                Invalid Format
              </span>
              <span className="text-xl font-bold text-rose-700">{validationResult.invalidCount}</span>
            </div>
          </div>

          {/* Action Toolbar for Matched Candidates */}
          {activeTab === 'existing' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {selectedCandidateIds.length} candidate(s) selected
              </span>

              <button
                onClick={() => onAssignCandidates(selectedCandidateIds)}
                disabled={selectedCandidateIds.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-40 transition-colors"
              >
                <Users className="w-4 h-4" />
                Assign Selected ({selectedCandidateIds.length}) to Virtual Group
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tab 1: Matched Existing Candidates */}
          {activeTab === 'existing' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {validationResult.existingCandidates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  None of the pasted numbers matched existing candidates in the database. Check the Unknown Numbers tab to register new candidate profiles.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50/80 uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-8">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="py-2.5 px-3">Candidate ID</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Normalized Phone</th>
                        <th className="py-2.5 px-3">Branch & Degree</th>
                        <th className="py-2.5 px-3">Passing Year</th>
                        <th className="py-2.5 px-3">WhatsApp Consent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.existingCandidates.map((cand) => {
                        const isChecked = selectedCandidateIds.includes(cand._id);
                        return (
                          <tr
                            key={cand._id}
                            onClick={() => toggleSelect(cand._id)}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              isChecked ? 'bg-indigo-50/40' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelect(cand._id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                              {cand.candidateId}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {cand.fullName}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{cand.normalizedPhoneNumber}</td>
                            <td className="py-2.5 px-3">
                              {cand.degree || 'N/A'} {cand.branch ? `• ${cand.branch}` : ''}
                            </td>
                            <td className="py-2.5 px-3">{cand.passingYear || 'N/A'}</td>
                            <td className="py-2.5 px-3">
                              {cand.whatsappConsent ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                                  Consented
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">
                                  No Consent
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Unknown Numbers */}
          {activeTab === 'unknown' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Unknown Valid Numbers</h4>
                <p className="text-xs text-slate-500">
                  These numbers are valid but do not have a candidate account in the database. Click "Create Profile" to register them with mandatory details before assignment.
                </p>
              </div>

              {validationResult.unknownNumbers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No unknown phone numbers found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {validationResult.unknownNumbers.map((phone) => (
                    <div
                      key={phone}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <span className="font-mono text-xs font-semibold text-slate-800">{phone}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUnknownToCreate(phone);
                          setCreateError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        Create Profile
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Invalid Inputs */}
          {activeTab === 'invalid' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Invalid Inputs Rejected</h4>
              {validationResult.invalidItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No invalid phone strings detected.</p>
              ) : (
                <div className="space-y-2">
                  {validationResult.invalidItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-red-200 bg-red-50/60 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-red-900">{item.raw}</span>
                      <span className="text-red-700 font-medium">{item.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Candidate Profile from Unknown Number */}
      {unknownToCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Register Candidate Profile</h3>
              </div>
              <button
                onClick={() => setUnknownToCreate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUnknown} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  disabled
                  value={unknownToCreate}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Degree</label>
                  <input
                    type="text"
                    value={createForm.degree}
                    onChange={(e) => setCreateForm({ ...createForm, degree: e.target.value })}
                    placeholder="e.g. B.Tech"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={createForm.branch}
                    onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })}
                    placeholder="e.g. CSE"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Passing Year</label>
                  <input
                    type="number"
                    value={createForm.passingYear}
                    onChange={(e) => setCreateForm({ ...createForm, passingYear: e.target.value })}
                    placeholder="e.g. 2026"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">College</label>
                  <input
                    type="text"
                    value={createForm.collegeName}
                    onChange={(e) => setCreateForm({ ...createForm, collegeName: e.target.value })}
                    placeholder="College name"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="ramesh@example.com"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modalConsentCheck"
                  checked={createForm.whatsappConsent}
                  onChange={(e) => setCreateForm({ ...createForm, whatsappConsent: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="modalConsentCheck" className="text-slate-700 font-medium cursor-pointer">
                  Candidate has given explicit WhatsApp messaging consent
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnknownToCreate(null)}
                  disabled={isCreating}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-lg shadow-xs"
                >
                  {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Register & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
