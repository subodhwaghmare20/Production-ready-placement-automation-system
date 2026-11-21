import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  GraduationCap,
  Briefcase,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getCompanyRequirements } from '../../services/companyService';
import { CompanyRequirementsData } from '../../types';

interface CompanyRequirementsModalProps {
  isOpen: boolean;
  companyId: string | null;
  onClose: () => void;
}

export const CompanyRequirementsModal: React.FC<CompanyRequirementsModalProps> = ({
  isOpen,
  companyId,
  onClose,
}) => {
  const [data, setData] = useState<CompanyRequirementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && companyId) {
      setLoading(true);
      setError(null);
      getCompanyRequirements(companyId)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to load requirements');
          setLoading(false);
        });
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Job Requirements & Eligibility Matrix
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {data?.companyName} • {data?.companyId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : error || !data ? (
          <div className="py-8 text-center text-xs text-rose-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error || 'No requirements data found'}</span>
          </div>
        ) : (
          <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Target Role & Openings */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase">Target Role</span>
                <p className="text-sm font-bold text-slate-900">{data.jobRole}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Vacancies</span>
                <p className="text-sm font-bold text-slate-900">{data.requiredCandidates} positions</p>
              </div>
            </div>

            {/* Academic Eligibility */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <GraduationCap className="w-4 h-4 text-slate-500" />
                <span>Academic Eligibility</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Eligible Branches:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.criteria.eligibleBranches.length > 0
                      ? data.criteria.eligibleBranches.join(', ')
                      : 'All Branches Eligible'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Eligible Degrees:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.criteria.eligibleDegrees.length > 0
                      ? data.criteria.eligibleDegrees.join(', ')
                      : 'All Degrees'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Batch / Passing Years:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.criteria.eligiblePassingYears.length > 0
                      ? data.criteria.eligiblePassingYears.join(', ')
                      : 'Open to All Batches'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Min CGPA & Backlogs:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    Min CGPA: {data.criteria.minimumCGPA ?? 'None'} • Max Backlogs:{' '}
                    {data.criteria.maximumBacklogs ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Skills & Experience */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <span>Skills & Experience Type</span>
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-500">Experience Type:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {data.criteria.experienceType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1.5">Required Skill Set:</span>
                  {data.criteria.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.criteria.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-800 font-medium rounded text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No specific skills listed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Compensation & Drive Schedule */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Drive Logistics</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Interview Date:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.recruitment.interviewDate
                      ? new Date(data.recruitment.interviewDate).toLocaleDateString()
                      : 'To Be Announced'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Interview Mode:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.recruitment.interviewMode}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Work Mode & Location:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.recruitment.workMode} • {data.recruitment.jobLocation || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Salary Package:</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">
                    {data.recruitment.salaryPackage || 'Undisclosed'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
