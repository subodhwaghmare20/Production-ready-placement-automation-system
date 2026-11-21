import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  UserCheck,
  Briefcase,
  DollarSign,
  Calendar,
  Plus,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Company, RecruitmentStatus, WorkMode, InterviewMode, CompanyExperienceType } from '../../types';

interface CompanyFormModalProps {
  isOpen: boolean;
  company?: Company | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Company>) => Promise<void>;
}

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  isOpen,
  company,
  isSaving,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(company);

  // Section A: Company Details
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // Section B: HR Contact
  const [hrName, setHrName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPhone, setHrPhone] = useState('');

  // Section C: Job Details
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requiredCandidates, setRequiredCandidates] = useState<number>(1);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [eligibleBranches, setEligibleBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState('');
  const [eligibleDegrees, setEligibleDegrees] = useState<string[]>([]);
  const [degreeInput, setDegreeInput] = useState('');
  const [eligiblePassingYears, setEligiblePassingYears] = useState<number[]>([]);
  const [yearInput, setYearInput] = useState('');
  const [experienceType, setExperienceType] = useState<CompanyExperienceType>('Fresher');
  const [minimumExperience, setMinimumExperience] = useState<number>(0);
  const [maximumExperience, setMaximumExperience] = useState<string>('');
  const [minimumCGPA, setMinimumCGPA] = useState<string>('');
  const [maximumBacklogs, setMaximumBacklogs] = useState<number>(0);

  // Section D: Compensation and Location
  const [salaryPackage, setSalaryPackage] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>('Office');

  // Section E: Recruitment Schedule
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('Online');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>('Active');
  const [notes, setNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setCompanyName(company.companyName || '');
      setIndustry(company.industry || '');
      setWebsite(company.website || '');
      setCompanyDescription(company.companyDescription || '');

      setHrName(company.hrName || '');
      setHrEmail(company.hrEmail || '');
      setHrPhone(company.hrPhone || '');

      setJobRole(company.jobRole || '');
      setJobDescription(company.jobDescription || '');
      setRequiredCandidates(company.requiredCandidates || 1);
      setRequiredSkills(company.requiredSkills || []);
      setEligibleBranches(company.eligibleBranches || []);
      setEligibleDegrees(company.eligibleDegrees || []);
      setEligiblePassingYears(company.eligiblePassingYears || []);
      setExperienceType(company.experienceType || 'Fresher');
      setMinimumExperience(company.minimumExperience || 0);
      setMaximumExperience(company.maximumExperience !== undefined ? String(company.maximumExperience) : '');
      setMinimumCGPA(company.minimumCGPA !== undefined ? String(company.minimumCGPA) : '');
      setMaximumBacklogs(company.maximumBacklogs || 0);

      setSalaryPackage(company.salaryPackage || '');
      setJobLocation(company.jobLocation || '');
      setWorkMode(company.workMode || 'Office');

      setApplicationDeadline(
        company.applicationDeadline ? new Date(company.applicationDeadline).toISOString().split('T')[0] : ''
      );
      setInterviewDate(
        company.interviewDate ? new Date(company.interviewDate).toISOString().split('T')[0] : ''
      );
      setInterviewMode(company.interviewMode || 'Online');
      setInterviewLocation(company.interviewLocation || '');
      setRecruitmentStatus(company.recruitmentStatus || 'Active');
      setNotes(company.notes || '');
    } else {
      setCompanyName('');
      setIndustry('Information Technology');
      setWebsite('');
      setCompanyDescription('');

      setHrName('');
      setHrEmail('');
      setHrPhone('');

      setJobRole('Software Engineer');
      setJobDescription('');
      setRequiredCandidates(5);
      setRequiredSkills(['React', 'Node.js', 'Python']);
      setEligibleBranches(['Computer Science', 'Information Technology']);
      setEligibleDegrees(['B.Tech', 'M.Tech', 'MCA']);
      setEligiblePassingYears([new Date().getFullYear()]);
      setExperienceType('Fresher');
      setMinimumExperience(0);
      setMaximumExperience('');
      setMinimumCGPA('6.5');
      setMaximumBacklogs(0);

      setSalaryPackage('6.5 - 9.0 LPA');
      setJobLocation('Bangalore');
      setWorkMode('Hybrid');

      setApplicationDeadline('');
      setInterviewDate('');
      setInterviewMode('Online');
      setInterviewLocation('');
      setRecruitmentStatus('Active');
      setNotes('');
    }
    setFormError(null);
  }, [company, isOpen]);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    const val = skillInput.trim();
    if (val && !requiredSkills.includes(val)) {
      setRequiredSkills([...requiredSkills, val]);
      setSkillInput('');
    }
  };

  const handleAddBranch = () => {
    const val = branchInput.trim();
    if (val && !eligibleBranches.includes(val)) {
      setEligibleBranches([...eligibleBranches, val]);
      setBranchInput('');
    }
  };

  const handleAddDegree = () => {
    const val = degreeInput.trim();
    if (val && !eligibleDegrees.includes(val)) {
      setEligibleDegrees([...eligibleDegrees, val]);
      setDegreeInput('');
    }
  };

  const handleAddYear = () => {
    const y = parseInt(yearInput.trim(), 10);
    if (!isNaN(y) && !eligiblePassingYears.includes(y)) {
      setEligiblePassingYears([...eligiblePassingYears, y]);
      setYearInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!companyName.trim()) {
      setFormError('Company name is required');
      return;
    }

    if (!jobRole.trim()) {
      setFormError('Job role is required');
      return;
    }

    if (requiredCandidates < 1) {
      setFormError('Required candidates count must be at least 1');
      return;
    }

    try {
      await onSave({
        companyName: companyName.trim(),
        industry: industry.trim(),
        website: website.trim(),
        companyDescription: companyDescription.trim(),
        hrName: hrName.trim(),
        hrEmail: hrEmail.trim(),
        hrPhone: hrPhone.trim(),
        jobRole: jobRole.trim(),
        jobDescription: jobDescription.trim(),
        requiredCandidates: Number(requiredCandidates),
        requiredSkills,
        eligibleBranches,
        eligibleDegrees,
        eligiblePassingYears,
        experienceType,
        minimumExperience: Number(minimumExperience) || 0,
        maximumExperience: maximumExperience ? Number(maximumExperience) : undefined,
        minimumCGPA: minimumCGPA ? Number(minimumCGPA) : undefined,
        maximumBacklogs: Number(maximumBacklogs) || 0,
        salaryPackage: salaryPackage.trim(),
        jobLocation: jobLocation.trim(),
        workMode,
        applicationDeadline: applicationDeadline ? applicationDeadline : undefined,
        interviewDate: interviewDate ? interviewDate : undefined,
        interviewMode,
        interviewLocation: interviewLocation.trim(),
        recruitmentStatus,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Error saving company');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-2 sm:my-8 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? `Edit Company: ${company?.companyName}` : 'Register New Company Drive'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure recruiter information, job opening specifications, eligibility criteria, and drive schedule.
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
          {/* SECTION A: Company Details */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Section A: Company Details
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google India Pvt Ltd, Tata Consultancy Services"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Fintech, SaaS, E-commerce"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-medium text-slate-700 mb-1">Corporate Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-medium text-slate-700 mb-1">Company Description</label>
                <textarea
                  rows={2}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Brief overview of company operations and culture"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: HR Contact Information */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Section B: HR & Recruiter Contact
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">HR Contact Name</label>
                <input
                  type="text"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  placeholder="e.g. Ananya Sen"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">HR Email Address</label>
                <input
                  type="email"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  placeholder="e.g. ananya.sen@recruiter.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">HR Phone / Mobile</label>
                <input
                  type="text"
                  value={hrPhone}
                  onChange={(e) => setHrPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* SECTION C: Job Details & Eligibility Matrix */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Section C: Job Profile & Eligibility Criteria
              </h3>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Job Role / Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g. Graduate Engineer Trainee, Full Stack Developer"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Required Candidates <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requiredCandidates}
                    onChange={(e) => setRequiredCandidates(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-medium text-slate-700 mb-1">Job Description</label>
                  <textarea
                    rows={2}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Responsibilities, technical expectations, and hiring round overview"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                  />
                </div>
              </div>

              {/* Skills Multi Input */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Required Skill Sets
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
                    placeholder="Type skill & press Enter (e.g. Java, React, SQL)"
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
                {requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-medium"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setRequiredSkills(requiredSkills.filter((item) => item !== s))}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Eligible Branches & Degrees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Eligible Branches</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={branchInput}
                      onChange={(e) => setBranchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBranch();
                        }
                      }}
                      placeholder="e.g. Computer Science, IT, ECE"
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddBranch}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                  {eligibleBranches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {eligibleBranches.map((b) => (
                        <span key={b} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] flex items-center gap-1">
                          {b}
                          <button type="button" onClick={() => setEligibleBranches(eligibleBranches.filter((x) => x !== b))}>
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Eligible Degrees</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={degreeInput}
                      onChange={(e) => setDegreeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDegree();
                        }
                      }}
                      placeholder="e.g. B.Tech, M.Tech, MCA"
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDegree}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                  {eligibleDegrees.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {eligibleDegrees.map((d) => (
                        <span key={d} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] flex items-center gap-1">
                          {d}
                          <button type="button" onClick={() => setEligibleDegrees(eligibleDegrees.filter((x) => x !== d))}>
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Passing Years, Experience, CGPA, Backlogs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Experience Type</label>
                  <select
                    value={experienceType}
                    onChange={(e) => setExperienceType(e.target.value as CompanyExperienceType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="Experienced">Experienced</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Min CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={minimumCGPA}
                    onChange={(e) => setMinimumCGPA(e.target.value)}
                    placeholder="e.g. 6.5"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Max Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    value={maximumBacklogs}
                    onChange={(e) => setMaximumBacklogs(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Add Passing Year</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleAddYear}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                    >
                      +
                    </button>
                  </div>
                  {eligiblePassingYears.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {eligiblePassingYears.map((y) => (
                        <span key={y} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] flex items-center gap-1 font-mono">
                          {y}
                          <button type="button" onClick={() => setEligiblePassingYears(eligiblePassingYears.filter((item) => item !== y))}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION D: Compensation and Location */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Section D: Compensation & Work Location
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Salary Package / CTC</label>
                <input
                  type="text"
                  value={salaryPackage}
                  onChange={(e) => setSalaryPackage(e.target.value)}
                  placeholder="e.g. 8.5 LPA, 12 - 15 LPA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Job Location</label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="e.g. Bangalore, Hyderabad, Pune, Mumbai"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                >
                  <option value="Office">In-Office</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION E: Recruitment Schedule & Status */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Section E: Recruitment Schedule & Drive Status
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Interview Date</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Recruitment Status</label>
                <select
                  value={recruitmentStatus}
                  onChange={(e) => setRecruitmentStatus(e.target.value as RecruitmentStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white font-semibold"
                >
                  <option value="Active">Active Drive</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Closed">Closed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Interview Mode</label>
                <select
                  value={interviewMode}
                  onChange={(e) => setInterviewMode(e.target.value as InterviewMode)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                >
                  <option value="Online">Online Video / Assessment</option>
                  <option value="Offline">On-Campus / In-Person</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Interview Location / Meeting Link</label>
                <input
                  type="text"
                  value={interviewLocation}
                  onChange={(e) => setInterviewLocation(e.target.value)}
                  placeholder="e.g. Auditorium Hall B, or Microsoft Teams link"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions or placement cell remarks"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>
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
                <span>{isEditing ? 'Update Company Profile' : 'Register Company Drive'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

