import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Download,
  Edit,
  Trash2,
  FolderTree,
  AlertCircle,
} from 'lucide-react';
import {
  getCandidateById,
  deleteCandidate,
  updateCandidate,
  getResumeDownloadUrl,
} from '../services/candidateService';
import { Candidate } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { CandidateFormModal } from '../components/candidates/CandidateFormModal';
import { DeleteConfirmModal } from '../components/candidates/DeleteConfirmModal';

export const CandidateProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCandidate = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCandidateById(id);
      setCandidate(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Candidate not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const handleUpdate = async (updatedData: Partial<Candidate>) => {
    if (!candidate) return;
    try {
      setIsSaving(true);
      const updated = await updateCandidate(candidate._id, updatedData);
      setCandidate(updated);
      setIsEditModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate) return;
    try {
      setIsDeleting(true);
      await deleteCandidate(candidate._id);
      navigate('/candidates', { replace: true });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading candidate record..." />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{error || 'Candidate not found'}</h3>
        <Link
          to="/candidates"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Candidate Directory
        </Link>
      </div>
    );
  }

  const statusVariant =
    candidate.placementStatus === 'Placed'
      ? 'success'
      : candidate.placementStatus === 'Available'
      ? 'info'
      : 'default';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/candidates"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Candidate Directory
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Profile
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            {candidate.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{candidate.fullName}</h1>
              <Badge variant={statusVariant}>{candidate.placementStatus}</Badge>
              {candidate.whatsappConsent ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp Consent Granted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <XCircle className="w-3.5 h-3.5" /> No Messaging Consent
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="font-mono font-semibold text-slate-700">{candidate.candidateId}</span>
              <span>•</span>
              <span>{candidate.branch || 'Branch not specified'}</span>
              <span>•</span>
              <span>Batch of {candidate.passingYear || 'N/A'}</span>
            </div>
          </div>
        </div>

        {candidate.resumeUrl && (
          <a
            href={getResumeDownloadUrl(candidate._id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-xs self-start md:self-auto"
          >
            <Download className="w-4 h-4" /> Download Resume
          </a>
        )}
      </div>

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Personal & Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Personal & Contact Information
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Phone (Original):</span>
              <span className="font-mono font-medium text-slate-900">{candidate.phoneNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Normalized (E.164):</span>
              <span className="font-mono font-bold text-slate-900">
                {candidate.normalizedPhoneNumber}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Email Address:</span>
              <span className="font-medium text-slate-900">{candidate.email || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Gender:</span>
              <span className="font-medium text-slate-900">{candidate.gender || '—'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Academic Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <GraduationCap className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Academic Background
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">College / Institute:</span>
              <span className="font-medium text-slate-900">{candidate.collegeName || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Degree:</span>
              <span className="font-medium text-slate-900">{candidate.degree || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Branch / Major:</span>
              <span className="font-medium text-slate-900">{candidate.branch || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Graduation Year:</span>
              <span className="font-medium text-slate-900">{candidate.passingYear || '—'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Skills & Professional */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Skills & Experience
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Experience Type:</span>
              <span className="font-semibold text-slate-900">{candidate.experienceType}</span>
            </div>
            {candidate.experienceType === 'Experienced' && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Experience Years:</span>
                <span className="font-medium text-slate-900">{candidate.experienceYears} Years</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 block mb-2">Technical Skills:</span>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-medium text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">No skills specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: WhatsApp Consent & Audit Logs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              WhatsApp Consent & Compliance
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Opt-in Status:</span>
              <span className="font-semibold text-slate-900">
                {candidate.whatsappConsent ? 'Explicit Consent Verified' : 'No Consent Recorded'}
              </span>
            </div>
            {candidate.whatsappConsentAt && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Recorded Timestamp:</span>
                <span className="text-slate-800">
                  {new Date(candidate.whatsappConsentAt).toLocaleString()}
                </span>
              </div>
            )}
            {candidate.whatsappConsentSource && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Consent Source:</span>
                <span className="text-slate-800 font-medium">{candidate.whatsappConsentSource}</span>
              </div>
            )}
            <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-[11px] leading-relaxed">
              Institutional Rule: Adding a mobile number does not automatically permit messaging.
              Only verified consent enables virtual group broadcasts.
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Ready: Company Virtual Groups Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">
              Company Virtual Groups
            </h2>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
            Coming in Upcoming Modules
          </span>
        </div>
        <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">
            Multi-Group Allocation Ready
          </p>
          <p className="max-w-md mx-auto">
            This candidate record can be assigned to multiple company-specific virtual groups (e.g. TCS Drive 2026, Infosys Specialist) once the Company module is activated.
          </p>
        </div>
      </div>

      {/* Modals */}
      <CandidateFormModal
        isOpen={isEditModalOpen}
        candidate={candidate}
        isSaving={isSaving}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdate}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        candidate={candidate}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};
