import { ICompany } from '../models/Company.model';
import { ICandidate } from '../models/Candidate.model';

export interface CriterionMatch {
  matched: boolean;
  status: 'matched' | 'not_matched' | 'unknown' | 'not_applicable';
  reason: string;
}

export interface CandidateEligibilityEvaluation {
  candidateId: string;
  isEligible: boolean;
  matchScore: number; // 0 to 100
  criteriaBreakdown: {
    degree: CriterionMatch;
    branch: CriterionMatch;
    passingYear: CriterionMatch;
    skills: CriterionMatch & { matchingSkills: string[]; missingSkills: string[] };
    experience: CriterionMatch;
  };
}

/**
 * Compares candidate profile against company requirements.
 * Missing candidate info is treated as unknown/not assumed eligible.
 */
export function evaluateCandidateEligibility(
  candidate: ICandidate,
  company: ICompany
): CandidateEligibilityEvaluation {
  let matchedCriteriaCount = 0;
  let totalEvaluatedCriteria = 0;

  // 1. Degree Evaluation
  totalEvaluatedCriteria++;
  let degreeMatch: CriterionMatch;
  if (!company.eligibleDegrees || company.eligibleDegrees.length === 0) {
    degreeMatch = { matched: true, status: 'not_applicable', reason: 'Open to all degrees' };
    matchedCriteriaCount++;
  } else if (!candidate.degree) {
    degreeMatch = { matched: false, status: 'unknown', reason: 'Degree not recorded on candidate profile (Unknown)' };
  } else {
    const isDegMatched = company.eligibleDegrees.some(
      (d) => d.toLowerCase() === candidate.degree?.toLowerCase()
    );
    degreeMatch = {
      matched: isDegMatched,
      status: isDegMatched ? 'matched' : 'not_matched',
      reason: isDegMatched
        ? `Degree matches (${candidate.degree})`
        : `Degree (${candidate.degree}) does not match required: ${company.eligibleDegrees.join(', ')}`,
    };
    if (isDegMatched) matchedCriteriaCount++;
  }

  // 2. Branch Evaluation
  totalEvaluatedCriteria++;
  let branchMatch: CriterionMatch;
  if (!company.eligibleBranches || company.eligibleBranches.length === 0) {
    branchMatch = { matched: true, status: 'not_applicable', reason: 'Open to all branches' };
    matchedCriteriaCount++;
  } else if (!candidate.branch) {
    branchMatch = { matched: false, status: 'unknown', reason: 'Branch not recorded on candidate profile (Unknown)' };
  } else {
    const isBranchMatched = company.eligibleBranches.some(
      (b) => b.toLowerCase() === candidate.branch?.toLowerCase()
    );
    branchMatch = {
      matched: isBranchMatched,
      status: isBranchMatched ? 'matched' : 'not_matched',
      reason: isBranchMatched
        ? `Branch matches (${candidate.branch})`
        : `Branch (${candidate.branch}) does not match required: ${company.eligibleBranches.join(', ')}`,
    };
    if (isBranchMatched) matchedCriteriaCount++;
  }

  // 3. Passing Year Evaluation
  totalEvaluatedCriteria++;
  let yearMatch: CriterionMatch;
  if (!company.eligiblePassingYears || company.eligiblePassingYears.length === 0) {
    yearMatch = { matched: true, status: 'not_applicable', reason: 'Open to all graduation batches' };
    matchedCriteriaCount++;
  } else if (!candidate.passingYear) {
    yearMatch = { matched: false, status: 'unknown', reason: 'Graduation year not recorded (Unknown)' };
  } else {
    const isYearMatched = company.eligiblePassingYears.includes(candidate.passingYear);
    yearMatch = {
      matched: isYearMatched,
      status: isYearMatched ? 'matched' : 'not_matched',
      reason: isYearMatched
        ? `Batch matches (${candidate.passingYear})`
        : `Batch (${candidate.passingYear}) does not match eligible: ${company.eligiblePassingYears.join(', ')}`,
    };
    if (isYearMatched) matchedCriteriaCount++;
  }

  // 4. Skills Evaluation
  totalEvaluatedCriteria++;
  const reqSkills = company.requiredSkills || [];
  const candSkills = (candidate.skills || []).map((s) => s.toLowerCase());
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of reqSkills) {
    if (candSkills.includes(skill.toLowerCase())) {
      matchingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  let skillsMatch: CriterionMatch & { matchingSkills: string[]; missingSkills: string[] };
  if (reqSkills.length === 0) {
    skillsMatch = {
      matched: true,
      status: 'not_applicable',
      reason: 'No technical skill prerequisites specified',
      matchingSkills: [],
      missingSkills: [],
    };
    matchedCriteriaCount++;
  } else if (matchingSkills.length > 0) {
    const allMatched = missingSkills.length === 0;
    skillsMatch = {
      matched: allMatched || matchingSkills.length >= Math.ceil(reqSkills.length / 2),
      status: allMatched ? 'matched' : 'matched',
      reason: `Matches ${matchingSkills.length}/${reqSkills.length} required skills (${matchingSkills.join(', ')})`,
      matchingSkills,
      missingSkills,
    };
    matchedCriteriaCount += (matchingSkills.length / reqSkills.length);
  } else {
    skillsMatch = {
      matched: false,
      status: 'not_matched',
      reason: `Missing required skills: ${reqSkills.join(', ')}`,
      matchingSkills: [],
      missingSkills: reqSkills,
    };
  }

  // 5. Experience Type Evaluation
  totalEvaluatedCriteria++;
  let expMatch: CriterionMatch;
  if (company.experienceType === candidate.experienceType) {
    expMatch = {
      matched: true,
      status: 'matched',
      reason: `Experience profile aligns (${candidate.experienceType})`,
    };
    matchedCriteriaCount++;
  } else {
    expMatch = {
      matched: false,
      status: 'not_matched',
      reason: `Company requires ${company.experienceType}, candidate is ${candidate.experienceType}`,
    };
  }

  const isEligible =
    degreeMatch.matched &&
    branchMatch.matched &&
    yearMatch.matched &&
    skillsMatch.matched &&
    expMatch.matched;

  const matchScore = Math.round((matchedCriteriaCount / totalEvaluatedCriteria) * 100);

  return {
    candidateId: candidate.candidateId,
    isEligible,
    matchScore,
    criteriaBreakdown: {
      degree: degreeMatch,
      branch: branchMatch,
      passingYear: yearMatch,
      skills: skillsMatch,
      experience: expMatch,
    },
  };
}

