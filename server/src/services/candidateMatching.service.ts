import { ICompany } from '../models/Company.model';
import { ICandidate } from '../models/Candidate.model';
import { evaluateCandidateEligibility, CandidateEligibilityEvaluation } from './eligibilityService';

export type EligibilityCategory = 'ELIGIBLE' | 'PARTIALLY_MATCHING' | 'NOT_ELIGIBLE';

export interface CategorizedCandidateEvaluation {
  candidate: ICandidate;
  candidateId: string;
  category: EligibilityCategory;
  categoryLabel: string;
  matchScore: number;
  evaluation: CandidateEligibilityEvaluation;
  summaryReasons: {
    matching: string[];
    uncertain: string[];
    failing: string[];
  };
}

export interface CompanyCandidateMatchingResult {
  companyId: string;
  companyName: string;
  jobRole: string;
  totalEvaluated: number;
  eligibleCount: number;
  partiallyMatchingCount: number;
  notEligibleCount: number;
  candidates: {
    eligible: CategorizedCandidateEvaluation[];
    partiallyMatching: CategorizedCandidateEvaluation[];
    notEligible: CategorizedCandidateEvaluation[];
  };
}

/**
 * Classifies candidate evaluation into Category A, B, or C
 */
export function categorizeCandidate(
  candidate: ICandidate,
  company: ICompany
): CategorizedCandidateEvaluation {
  const evalResult = evaluateCandidateEligibility(candidate, company);
  const bd = evalResult.criteriaBreakdown;

  const matching: string[] = [];
  const uncertain: string[] = [];
  const failing: string[] = [];

  const checks = [
    { name: 'Degree', item: bd.degree },
    { name: 'Branch', item: bd.branch },
    { name: 'Passing Year', item: bd.passingYear },
    { name: 'Experience', item: bd.experience },
    { name: 'Skills', item: bd.skills },
  ];

  let hasHardFailure = false;
  let hasUnknown = false;
  let hasMatches = false;

  for (const c of checks) {
    if (c.item.status === 'matched') {
      matching.push(`${c.name}: ${c.item.reason}`);
      hasMatches = true;
    } else if (c.item.status === 'not_matched') {
      failing.push(`${c.name}: ${c.item.reason}`);
      hasHardFailure = true;
    } else if (c.item.status === 'unknown') {
      uncertain.push(`${c.name}: ${c.item.reason}`);
      hasUnknown = true;
    }
  }

  // Determine Category:
  // A. Eligible: satisfies all required criteria (no hard failures, no unknowns on evaluated fields)
  // C. Not Eligible: clearly fails one or more mandatory criteria
  // B. Partially Matching: has some matches, but missing/uncertain information without a hard failure, or partial skills
  let category: EligibilityCategory = 'ELIGIBLE';
  let categoryLabel = 'Eligible (All Criteria Met)';

  if (hasHardFailure) {
    category = 'NOT_ELIGIBLE';
    categoryLabel = 'Not Eligible (Mandatory Criteria Failed)';
  } else if (hasUnknown || evalResult.matchScore < 100) {
    category = 'PARTIALLY_MATCHING';
    categoryLabel = 'Partially Matching (Missing Information or Partial Skills)';
  }

  return {
    candidate,
    candidateId: candidate.candidateId,
    category,
    categoryLabel,
    matchScore: evalResult.matchScore,
    evaluation: evalResult,
    summaryReasons: {
      matching,
      uncertain,
      failing,
    },
  };
}

/**
 * Evaluates a list of candidates against a company profile and groups them into 3 categories
 */
export function matchCandidatesForCompany(
  candidates: ICandidate[],
  company: ICompany
): CompanyCandidateMatchingResult {
  const eligible: CategorizedCandidateEvaluation[] = [];
  const partiallyMatching: CategorizedCandidateEvaluation[] = [];
  const notEligible: CategorizedCandidateEvaluation[] = [];

  for (const cand of candidates) {
    const cat = categorizeCandidate(cand, company);
    if (cat.category === 'ELIGIBLE') {
      eligible.push(cat);
    } else if (cat.category === 'PARTIALLY_MATCHING') {
      partiallyMatching.push(cat);
    } else {
      notEligible.push(cat);
    }
  }

  return {
    companyId: String(company.companyId || company._id),
    companyName: company.companyName,
    jobRole: company.jobRole,
    totalEvaluated: candidates.length,
    eligibleCount: eligible.length,
    partiallyMatchingCount: partiallyMatching.length,
    notEligibleCount: notEligible.length,
    candidates: {
      eligible,
      partiallyMatching,
      notEligible,
    },
  };
}

