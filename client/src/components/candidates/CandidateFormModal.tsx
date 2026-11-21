import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Award,
  MessageSquare,
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { Candidate, PlacementStatus, ExperienceType } from '../../types';
import { uploadResume } from '../../services/candidateService';

interface CandidateFormModalProps {
  isOpen: boolean;
  candidate?: Candidate | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Candidate>) => Promise<void>;
}

export const CandidateFormModal: React.FC<CandidateFormModalProps> = ({
  isOpen,
  candidate,
  isSaving,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(candidate);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');

  const [collegeName, setCollegeName] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [passingYear, setPassingYear] = useState<string>('');

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experienceType, setExperienceType] = useState<ExperienceType>('Fresher');
  const [experienceYears, setExperienceYears] = useState<number>(0);

  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeOriginalName, setResumeOriginalName] = useState('');
  const [resumeMimeType, setResumeMimeType] = useState('');
  const [resumeFileSize, setResumeFileSize] = useState<number | undefined>();
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const [placementStatus, setPlacementStatus] = useState<PlacementStatus>('Available');
  const [notes, setNotes] = useState('');

  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [whatsappConsentSource, setWhatsappConsentSource] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (candidate) {
      setFullName(candidate.fullName || '');
      setPhoneNumber(candidate.phoneNumber || '');
      setEmail(candidate.email || '');
      setGender(candidate.gender || '');

      setCollegeName(candidate.collegeName || '');
      setDegree(candidate.degree || '');
      setBranch(candidate.branch || '');
      setPassingYear(candidate.passingYear ? String(candidate.passingYear) : '');

      setSkills(candidate.skills || []);
      setExperienceType(candidate.experienceType || 'Fresher');
      setExperienceYears(candidate.experienceYears || 0);

      setResumeUrl(candidate.resumeUrl || '');
      setResumeOriginalName(candidate.resumeOriginalName || '');
      setResumeMimeType(candidate.resumeMimeType || '');
      setResumeFileSize(candidate.resumeFileSize);

      setPlacementStatus(candidate.placementStatus || 'Available');
      setNotes(candidate.notes || '');

      setWhatsappConsent(Boolean(candidate.whatsappConsent));
      setWhatsappConsentSource(candidate.whatsappConsentSource || '');
    } else {
      // Reset form
      setFullName('');
      setPhoneNumber('');
      setEmail('');
      setGender('');
      setCollegeName('');
      setDegree('B.Tech');
      setBranch('Computer Science');
      setPassingYear(String(new Date().getFullYear()));
      setSkills([]);
      setExperienceType('Fresher');
      setExperienceYears(0);
      setResumeUrl('');
      setResumeOriginalName('');
      setResumeMimeType('');
      setResumeFileSize(undefined);
      setPlacementStatus('Available');
      setNotes('');
      setWhatsappConsent(false);
      setWhatsappConsentSource('');
    }
    setFormError(null);
  }, [candidate, isOpen]);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingResume(true);
      setFormError(null);
      const res = await uploadResume(file);
      setResumeUrl(res.filename);
      setResumeOriginalName(res.originalName);
      setResumeMimeType(res.mimetype);
      setResumeFileSize(res.size);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to upload resume file');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Full Name is required');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Phone Number is required');
      return;
    }

    try {
      await onSave({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        gender,
        collegeName: collegeName.trim(),
        degree: degree.trim(),
        branch: branch.trim(),
        passingYear: passingYear ? Number(passingYear) : undefined,
        skills,
        experienceType,
        experienceYears: Number(experienceYears) || 0,
        resumeUrl,
        resumeOriginalName,
        resumeMimeType,
        resumeFileSize,
        placementStatus,
        whatsappConsent,
        whatsappConsentSource: whatsappConsent ? (whatsappConsentSource || 'Admin Portal Entry') : '',
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Error saving candidate');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-2 sm:my-8 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? `Edit Candidate: ${candidate?.candidateId}` : 'Add New Candidate'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter candidate academic details, skills, and explicit messaging preferences.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Section 1: Personal Information */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <User className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Personal Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Automatically normalized to E.164 (+91 standard for Indian numbers).
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aarav.sharma@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Education */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <GraduationCap className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Education Details
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">College / Institute</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Institute of Technology"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Degree</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. B.Tech, M.Tech, MCA, BCA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Branch / Major</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science, IT, ECE"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Passing Year</label>
                <input
                  type="number"
                  value={passingYear}
                  onChange={(e) => setPassingYear(e.target.value)}
                  placeholder="e.g. 2026"
                  min="1990"
                  max="2035"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Professional & Skills */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Professional Skills & Resume
              </h3>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Skills (press Enter or Add)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="e.g. React, Node.js, Python, SQL"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-medium"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Experience Type</label>
                  <select
                    value={experienceType}
                    onChange={(e) => setExperienceType(e.target.value as ExperienceType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="Experienced">Experienced</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                    disabled={experienceType === 'Fresher'}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Resume Upload Dropzone */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Resume File</label>
                <div className="p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      {resumeOriginalName ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{resumeOriginalName}</p>
                          <p className="text-[10px] text-slate-400">
                            {resumeFileSize ? `${(resumeFileSize / 1024).toFixed(1)} KB` : 'Uploaded'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-slate-600">No resume attached</p>
                          <p className="text-[10px] text-slate-400">PDF, DOC, DOCX up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {resumeUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setResumeUrl('');
                          setResumeOriginalName('');
                          setResumeMimeType('');
                          setResumeFileSize(undefined);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Remove
                      </button>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                      {isUploadingResume ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{resumeUrl ? 'Replace' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Placement Status & Notes */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <Award className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Placement Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Placement Status</label>
                <select
                  value={placementStatus}
                  onChange={(e) => setPlacementStatus(e.target.value as PlacementStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                >
                  <option value="Available">Available</option>
                  <option value="Placed">Placed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional placement officer notes"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: WhatsApp Messaging Consent */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                5. WhatsApp Messaging Permission
              </h3>
            </div>
            <div className="text-xs text-slate-600 mb-3">
              Institutional policy requires explicit opt-in confirmation before automated placement broadcasts can be delivered.
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-900">
                Candidate has granted explicit consent for WhatsApp placement updates
              </span>
            </label>

            {whatsappConsent && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Consent Source / Documentation
                </label>
                <input
                  type="text"
                  value={whatsappConsentSource}
                  onChange={(e) => setWhatsappConsentSource(e.target.value)}
                  placeholder="e.g. Placement Enrollment Form 2026, Signed Undertaking"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50 min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Candidate' : 'Create Candidate'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
