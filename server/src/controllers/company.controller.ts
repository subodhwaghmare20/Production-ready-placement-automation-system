import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Company, ICompany, RecruitmentStatus, WorkMode, InterviewMode, CompanyExperienceType } from '../models/Company.model';
import { generateCompanyId } from '../utils/idGenerator';
import { isValidEmail } from '../utils/phoneNormalizer';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * POST /api/companies
 * Create a new company drive & job profile
 */
export const createCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      companyName,
      industry,
      website,
      companyDescription,
      hrName,
      hrEmail,
      hrPhone,
      jobRole,
      jobDescription,
      requiredCandidates,
      requiredSkills,
      eligibleBranches,
      eligibleDegrees,
      eligiblePassingYears,
      experienceType,
      minimumExperience,
      maximumExperience,
      minimumCGPA,
      maximumBacklogs,
      salaryPackage,
      jobLocation,
      workMode,
      applicationDeadline,
      interviewDate,
      interviewMode,
      interviewLocation,
      recruitmentStatus,
      notes,
    } = req.body;

    if (!companyName || !companyName.trim()) {
      res.status(400).json({ success: false, message: 'Company name is required' });
      return;
    }

    if (!jobRole || !jobRole.trim()) {
      res.status(400).json({ success: false, message: 'Job role is required' });
      return;
    }

    const candidateCount = parseInt(requiredCandidates, 10);
    if (isNaN(candidateCount) || candidateCount < 1) {
      res.status(400).json({
        success: false,
        message: 'Required candidates must be a valid number of at least 1',
      });
      return;
    }

    if (hrEmail && !isValidEmail(hrEmail)) {
      res.status(400).json({ success: false, message: 'Invalid HR email address format' });
      return;
    }

    const newCompany = new Company({
      companyId: generateCompanyId(),
      companyName: companyName.trim(),
      industry: industry ? industry.trim() : '',
      website: website ? website.trim() : '',
      companyDescription: companyDescription ? companyDescription.trim() : '',
      hrName: hrName ? hrName.trim() : '',
      hrEmail: hrEmail ? hrEmail.trim().toLowerCase() : '',
      hrPhone: hrPhone ? hrPhone.trim() : '',
      jobRole: jobRole.trim(),
      jobDescription: jobDescription ? jobDescription.trim() : '',
      requiredCandidates: candidateCount,
      requiredSkills: Array.isArray(requiredSkills)
        ? requiredSkills.map((s: string) => s.trim()).filter(Boolean)
        : typeof requiredSkills === 'string'
        ? requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      eligibleBranches: Array.isArray(eligibleBranches)
        ? eligibleBranches.map((b: string) => b.trim()).filter(Boolean)
        : typeof eligibleBranches === 'string'
        ? eligibleBranches.split(',').map((b) => b.trim()).filter(Boolean)
        : [],
      eligibleDegrees: Array.isArray(eligibleDegrees)
        ? eligibleDegrees.map((d: string) => d.trim()).filter(Boolean)
        : typeof eligibleDegrees === 'string'
        ? eligibleDegrees.split(',').map((d) => d.trim()).filter(Boolean)
        : [],
      eligiblePassingYears: Array.isArray(eligiblePassingYears)
        ? eligiblePassingYears.map(Number).filter((y) => !isNaN(y))
        : typeof eligiblePassingYears === 'string'
        ? eligiblePassingYears.split(',').map((y) => Number(y.trim())).filter((y) => !isNaN(y))
        : [],
      experienceType: (experienceType as CompanyExperienceType) || 'Fresher',
      minimumExperience: minimumExperience !== undefined && minimumExperience !== '' ? Number(minimumExperience) : 0,
      maximumExperience: maximumExperience !== undefined && maximumExperience !== '' ? Number(maximumExperience) : undefined,
      minimumCGPA: minimumCGPA !== undefined && minimumCGPA !== '' ? Number(minimumCGPA) : undefined,
      maximumBacklogs: maximumBacklogs !== undefined && maximumBacklogs !== '' ? Number(maximumBacklogs) : 0,
      salaryPackage: salaryPackage ? salaryPackage.trim() : '',
      jobLocation: jobLocation ? jobLocation.trim() : '',
      workMode: (workMode as WorkMode) || 'Office',
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
      interviewMode: (interviewMode as InterviewMode) || 'Online',
      interviewLocation: interviewLocation ? interviewLocation.trim() : '',
      recruitmentStatus: (recruitmentStatus as RecruitmentStatus) || 'Active',
      notes: notes ? notes.trim() : '',
    });

    await newCompany.save();

    res.status(201).json({
      success: true,
      message: 'Company profile created successfully',
      data: newCompany,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/companies
 * Paginated list with multi-criteria search and filter
 */
export const getCompanies = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      recruitmentStatus,
      jobLocation,
      experienceType,
      workMode,
      industry,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { companyName: searchRegex },
        { jobRole: searchRegex },
        { companyId: searchRegex },
        { industry: searchRegex },
        { jobLocation: searchRegex },
        { hrName: searchRegex },
      ];
    }

    if (recruitmentStatus && typeof recruitmentStatus === 'string' && recruitmentStatus.trim()) {
      filter.recruitmentStatus = recruitmentStatus.trim();
    }

    if (jobLocation && typeof jobLocation === 'string' && jobLocation.trim()) {
      filter.jobLocation = new RegExp(jobLocation.trim(), 'i');
    }

    if (experienceType && typeof experienceType === 'string' && experienceType.trim()) {
      filter.experienceType = experienceType.trim();
    }

    if (workMode && typeof workMode === 'string' && workMode.trim()) {
      filter.workMode = workMode.trim();
    }

    if (industry && typeof industry === 'string' && industry.trim()) {
      filter.industry = new RegExp(industry.trim(), 'i');
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';

    const [total, companies] = await Promise.all([
      Company.countDocuments(filter),
      Company.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: {
        companies,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/companies/stats
 * Aggregate company recruitment metrics
 */
export const getCompanyStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      onHoldCompanies,
      closedCompanies,
      completedCompanies,
      candidateAggregation,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ recruitmentStatus: 'Active' }),
      Company.countDocuments({ recruitmentStatus: 'On Hold' }),
      Company.countDocuments({ recruitmentStatus: 'Closed' }),
      Company.countDocuments({ recruitmentStatus: 'Completed' }),
      Company.aggregate([
        { $group: { _id: null, totalRequired: { $sum: '$requiredCandidates' } } },
      ]),
    ]);

    const totalRequiredCandidates =
      candidateAggregation.length > 0 ? candidateAggregation[0].totalRequired : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        onHoldCompanies,
        closedCompanies,
        completedCompanies,
        totalRequiredCandidates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/companies/:id
 * Retrieve company details by MongoDB _id or companyId
 */
export const getCompanyById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { companyId: id };

    const company = await Company.findOne(query);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    res.status(200).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/companies/:id/requirements
 * Returns structured candidate eligibility requirements for matching
 */
export const getCompanyRequirements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { companyId: id };

    const company = await Company.findOne(query);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        companyId: company.companyId,
        companyName: company.companyName,
        jobRole: company.jobRole,
        requiredCandidates: company.requiredCandidates,
        criteria: {
          skills: company.requiredSkills,
          eligibleBranches: company.eligibleBranches,
          eligibleDegrees: company.eligibleDegrees,
          eligiblePassingYears: company.eligiblePassingYears,
          experienceType: company.experienceType,
          minimumExperience: company.minimumExperience,
          maximumExperience: company.maximumExperience,
          minimumCGPA: company.minimumCGPA,
          maximumBacklogs: company.maximumBacklogs,
        },
        recruitment: {
          recruitmentStatus: company.recruitmentStatus,
          interviewDate: company.interviewDate,
          interviewMode: company.interviewMode,
          workMode: company.workMode,
          salaryPackage: company.salaryPackage,
          jobLocation: company.jobLocation,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/companies/:id
 * Update company information or recruitment status
 */
export const updateCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { companyId: id };

    const company = await Company.findOne(query);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const {
      companyName,
      industry,
      website,
      companyDescription,
      hrName,
      hrEmail,
      hrPhone,
      jobRole,
      jobDescription,
      requiredCandidates,
      requiredSkills,
      eligibleBranches,
      eligibleDegrees,
      eligiblePassingYears,
      experienceType,
      minimumExperience,
      maximumExperience,
      minimumCGPA,
      maximumBacklogs,
      salaryPackage,
      jobLocation,
      workMode,
      applicationDeadline,
      interviewDate,
      interviewMode,
      interviewLocation,
      recruitmentStatus,
      notes,
    } = req.body;

    if (companyName !== undefined) company.companyName = companyName.trim();
    if (industry !== undefined) company.industry = industry.trim();
    if (website !== undefined) company.website = website.trim();
    if (companyDescription !== undefined) company.companyDescription = companyDescription.trim();

    if (hrName !== undefined) company.hrName = hrName.trim();
    if (hrEmail !== undefined) {
      if (hrEmail && !isValidEmail(hrEmail)) {
        res.status(400).json({ success: false, message: 'Invalid HR email format' });
        return;
      }
      company.hrEmail = hrEmail.trim().toLowerCase();
    }
    if (hrPhone !== undefined) company.hrPhone = hrPhone.trim();

    if (jobRole !== undefined) company.jobRole = jobRole.trim();
    if (jobDescription !== undefined) company.jobDescription = jobDescription.trim();
    if (requiredCandidates !== undefined) {
      const parsedCount = parseInt(requiredCandidates, 10);
      if (!isNaN(parsedCount) && parsedCount >= 1) {
        company.requiredCandidates = parsedCount;
      }
    }

    if (requiredSkills !== undefined) {
      company.requiredSkills = Array.isArray(requiredSkills)
        ? requiredSkills.map((s: string) => s.trim()).filter(Boolean)
        : typeof requiredSkills === 'string'
        ? requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }

    if (eligibleBranches !== undefined) {
      company.eligibleBranches = Array.isArray(eligibleBranches)
        ? eligibleBranches.map((b: string) => b.trim()).filter(Boolean)
        : typeof eligibleBranches === 'string'
        ? eligibleBranches.split(',').map((b) => b.trim()).filter(Boolean)
        : [];
    }

    if (eligibleDegrees !== undefined) {
      company.eligibleDegrees = Array.isArray(eligibleDegrees)
        ? eligibleDegrees.map((d: string) => d.trim()).filter(Boolean)
        : typeof eligibleDegrees === 'string'
        ? eligibleDegrees.split(',').map((d) => d.trim()).filter(Boolean)
        : [];
    }

    if (eligiblePassingYears !== undefined) {
      company.eligiblePassingYears = Array.isArray(eligiblePassingYears)
        ? eligiblePassingYears.map(Number).filter((y) => !isNaN(y))
        : typeof eligiblePassingYears === 'string'
        ? eligiblePassingYears.split(',').map((y) => Number(y.trim())).filter((y) => !isNaN(y))
        : [];
    }

    if (experienceType !== undefined) company.experienceType = experienceType as CompanyExperienceType;
    if (minimumExperience !== undefined) company.minimumExperience = Number(minimumExperience) || 0;
    if (maximumExperience !== undefined) company.maximumExperience = Number(maximumExperience) || undefined;
    if (minimumCGPA !== undefined) company.minimumCGPA = Number(minimumCGPA) || undefined;
    if (maximumBacklogs !== undefined) company.maximumBacklogs = Number(maximumBacklogs) || 0;

    if (salaryPackage !== undefined) company.salaryPackage = salaryPackage.trim();
    if (jobLocation !== undefined) company.jobLocation = jobLocation.trim();
    if (workMode !== undefined) company.workMode = workMode as WorkMode;

    if (applicationDeadline !== undefined) {
      company.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : undefined;
    }
    if (interviewDate !== undefined) {
      company.interviewDate = interviewDate ? new Date(interviewDate) : undefined;
    }
    if (interviewMode !== undefined) company.interviewMode = interviewMode as InterviewMode;
    if (interviewLocation !== undefined) company.interviewLocation = interviewLocation.trim();
    if (recruitmentStatus !== undefined) company.recruitmentStatus = recruitmentStatus as RecruitmentStatus;

    if (notes !== undefined) company.notes = notes.trim();

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company profile updated successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/companies/:id
 * Remove company record
 */
export const deleteCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { companyId: id };

    const company = await Company.findOne(query);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    await Company.deleteOne({ _id: company._id });

    res.status(200).json({
      success: true,
      message: `Company ${company.companyName} (${company.companyId}) removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

