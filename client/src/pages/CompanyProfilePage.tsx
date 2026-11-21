import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  UserCheck,
  Briefcase,
  Calendar,
  Globe,
  GraduationCap,
  FolderTree,
  Edit,
  Trash2,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { getCompanyById, deleteCompany, updateCompany } from '../services/companyService';
import { Company } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { CompanyFormModal } from '../components/companies/CompanyFormModal';
import { DeleteCompanyModal } from '../components/companies/DeleteCompanyModal';
import { CompanyRequirementsModal } from '../components/companies/CompanyRequirementsModal';

export const CompanyProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCompany = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCompanyById(id);
      setCompany(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Company not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const handleUpdate = async (data: Partial<Company>) => {
    if (!company) return;
    try {
      setIsSaving(true);
      const updated = await updateCompany(company._id, data);
      setCompany(updated);
      setIsEditModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    try {
      setIsDeleting(true);
      await deleteCompany(company._id);
      navigate('/companies', { replace: true });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading company drive details..." />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{error || 'Company not found'}</h3>
        <Link
          to="/companies"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Company Directory
        </Link>
      </div>
    );
  }

  const statusVariant =
    company.recruitmentStatus === 'Active'
      ? 'success'
      : company.recruitmentStatus === 'On Hold'
      ? 'warning'
      : company.recruitmentStatus === 'Closed'
      ? 'danger'
      : 'info';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/companies"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Companies Directory
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsReqModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs"
          >
            <FileCheck className="w-3.5 h-3.5" /> View Requirements
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Drive
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
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{company.companyName}</h1>
              <Badge variant={statusVariant}>{company.recruitmentStatus}</Badge>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {company.requiredCandidates} Openings
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="font-mono font-semibold text-slate-700">{company.companyId}</span>
              <span>•</span>
              <span className="font-semibold text-slate-800">{company.jobRole}</span>
              <span>•</span>
              <span>{company.industry || 'General Industry'}</span>
              {company.website && (
                <>
                  <span>•</span>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 hover:underline"
                  >
                    <Globe className="w-3 h-3" /> Website
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {company.salaryPackage && (
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-right self-start md:self-auto">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Compensation Package
            </span>
            <span className="text-base font-bold text-emerald-900">{company.salaryPackage}</span>
          </div>
        )}
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Job Opening Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Role & Work Environment
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Designation / Role:</span>
              <span className="font-semibold text-slate-900">{company.jobRole}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Job Location:</span>
              <span className="font-medium text-slate-900">{company.jobLocation || 'Open / Pan-India'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Work Mode:</span>
              <span className="font-medium text-slate-900">{company.workMode}</span>
            </div>
            {company.jobDescription && (
              <div>
                <span className="text-slate-500 block mb-1">Job Description:</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {company.jobDescription}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: HR & Recruiter Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              HR Contact Information
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Recruiter / HR Name:</span>
              <span className="font-medium text-slate-900">{company.hrName || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Official HR Email:</span>
              <span className="font-mono text-slate-800">{company.hrEmail || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">HR Mobile / Phone:</span>
              <span className="font-mono text-slate-800">{company.hrPhone || '—'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-[11px] leading-relaxed">
              Contact information is strictly accessible by placement officers for scheduling and interview coordination.
            </div>
          </div>
        </div>

        {/* Card 3: Academic Eligibility Criteria */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <GraduationCap className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Academic Eligibility Matrix
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Eligible Branches:</span>
              <span className="font-semibold text-slate-800 text-right">
                {company.eligibleBranches.length > 0
                  ? company.eligibleBranches.join(', ')
                  : 'All Engineering Branches'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Degrees Allowed:</span>
              <span className="font-medium text-slate-800 text-right">
                {company.eligibleDegrees.length > 0 ? company.eligibleDegrees.join(', ') : 'All Degrees'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Eligible Batches:</span>
              <span className="font-mono font-medium text-slate-800">
                {company.eligiblePassingYears.length > 0
                  ? company.eligiblePassingYears.join(', ')
                  : 'Open to All Batches'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Cut-off Threshold:</span>
              <span className="font-medium text-slate-800">
                Min CGPA: {company.minimumCGPA ?? 'None'} • Max Backlogs: {company.maximumBacklogs ?? 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1.5">Required Skills:</span>
              {company.requiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {company.requiredSkills.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">No specific technical skill filters</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Drive Schedule Logistics */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recruitment Drive Schedule
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Application Deadline:</span>
              <span className="font-medium text-slate-900">
                {company.applicationDeadline
                  ? new Date(company.applicationDeadline).toLocaleDateString()
                  : 'Open until filled'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Interview Date:</span>
              <span className="font-bold text-slate-900">
                {company.interviewDate
                  ? new Date(company.interviewDate).toLocaleDateString()
                  : 'To Be Decided'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Interview Mode:</span>
              <span className="font-semibold text-slate-800">{company.interviewMode}</span>
            </div>
            {company.interviewLocation && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Venue / Platform:</span>
                <span className="font-medium text-slate-800 text-right">{company.interviewLocation}</span>
              </div>
            )}
            {company.notes && (
              <div>
                <span className="text-slate-500 block mb-1">Placement Cell Notes:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {company.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modular Section: Assigned Virtual Groups (Ready for Module 5) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">
              Company-Specific Virtual Groups & Candidate Pool
            </h2>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
            Coming in Module 5
          </span>
        </div>
        <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">
            Automated Virtual Group Segmentation Architecture
          </p>
          <p className="max-w-md mx-auto">
            Once Virtual Groups (Module 5) are initialized, eligible candidates matching this company's CGPA, branches, and skills will be clustered into targeted communication channels.
          </p>
        </div>
      </div>

      {/* Modals */}
      <CompanyFormModal
        isOpen={isEditModalOpen}
        company={company}
        isSaving={isSaving}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdate}
      />

      <DeleteCompanyModal
        isOpen={isDeleteModalOpen}
        company={company}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <CompanyRequirementsModal
        isOpen={isReqModalOpen}
        companyId={company._id}
        onClose={() => setIsReqModalOpen(false)}
      />
    </div>
  );
};
