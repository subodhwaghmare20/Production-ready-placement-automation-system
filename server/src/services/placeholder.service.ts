export interface PlaceholderDefinition {
  key: string;
  tag: string;
  category: 'Candidate' | 'Company' | 'Interview' | 'Administrative';
  label: string;
  description: string;
  sampleValue: string;
}

export const SUPPORTED_PLACEHOLDERS: PlaceholderDefinition[] = [
  // Candidate Details
  {
    key: 'candidateName',
    tag: '{{candidateName}}',
    category: 'Candidate',
    label: 'Candidate Full Name',
    description: 'Full name of the candidate (e.g. Rahul Sharma)',
    sampleValue: 'Rahul Sharma',
  },
  {
    key: 'candidateFirstName',
    tag: '{{candidateFirstName}}',
    category: 'Candidate',
    label: 'Candidate First Name',
    description: 'First name extracted from candidate name (e.g. Rahul)',
    sampleValue: 'Rahul',
  },
  {
    key: 'candidatePhone',
    tag: '{{candidatePhone}}',
    category: 'Candidate',
    label: 'Candidate Phone',
    description: 'Mobile phone number formatted in E.164',
    sampleValue: '+919876543210',
  },
  {
    key: 'candidateEmail',
    tag: '{{candidateEmail}}',
    category: 'Candidate',
    label: 'Candidate Email',
    description: 'Registered student email address',
    sampleValue: 'rahul.sharma@example.edu',
  },
  {
    key: 'collegeName',
    tag: '{{collegeName}}',
    category: 'Candidate',
    label: 'College Name',
    description: 'Educational institution or campus name',
    sampleValue: 'Institute of Technology',
  },
  {
    key: 'degree',
    tag: '{{degree}}',
    category: 'Candidate',
    label: 'Degree',
    description: 'Academic qualification (e.g. B.Tech, MCA)',
    sampleValue: 'B.Tech',
  },
  {
    key: 'branch',
    tag: '{{branch}}',
    category: 'Candidate',
    label: 'Branch / Stream',
    description: 'Department of specialization (e.g. CSE, IT)',
    sampleValue: 'Computer Science',
  },
  {
    key: 'passingYear',
    tag: '{{passingYear}}',
    category: 'Candidate',
    label: 'Graduation Year',
    description: 'Expected or completed graduation year (e.g. 2026)',
    sampleValue: '2026',
  },
  {
    key: 'skills',
    tag: '{{skills}}',
    category: 'Candidate',
    label: 'Skills',
    description: 'Comma-separated technical or domain skills',
    sampleValue: 'React, Node.js, Python',
  },

  // Company Details
  {
    key: 'companyName',
    tag: '{{companyName}}',
    category: 'Company',
    label: 'Company Name',
    description: 'Hiring corporate organization or firm',
    sampleValue: 'Apex Cloud Systems',
  },
  {
    key: 'industry',
    tag: '{{industry}}',
    category: 'Company',
    label: 'Industry',
    description: 'Sector or domain of the company (e.g. Information Technology)',
    sampleValue: 'Software & Cloud Services',
  },
  {
    key: 'jobRole',
    tag: '{{jobRole}}',
    category: 'Company',
    label: 'Job Role',
    description: 'Target job title or recruitment position',
    sampleValue: 'Software Development Engineer',
  },
  {
    key: 'jobDescription',
    tag: '{{jobDescription}}',
    category: 'Company',
    label: 'Job Description',
    description: 'Summary of the job role and core responsibilities',
    sampleValue: 'Full-stack software development and cloud engineering.',
  },
  {
    key: 'salaryPackage',
    tag: '{{salaryPackage}}',
    category: 'Company',
    label: 'Salary Package / CTC',
    description: 'Compensation package offered (e.g. 6.5 LPA)',
    sampleValue: '6.5 LPA',
  },
  {
    key: 'jobLocation',
    tag: '{{jobLocation}}',
    category: 'Company',
    label: 'Job Location',
    description: 'City or posting destination (e.g. Bangalore, Pune)',
    sampleValue: 'Bangalore',
  },
  {
    key: 'workMode',
    tag: '{{workMode}}',
    category: 'Company',
    label: 'Work Mode',
    description: 'Office, Hybrid, or Remote arrangement',
    sampleValue: 'Hybrid',
  },

  // Interview Details
  {
    key: 'interviewDate',
    tag: '{{interviewDate}}',
    category: 'Interview',
    label: 'Interview Date',
    description: 'Scheduled drive or interview date',
    sampleValue: '28 November 2026',
  },
  {
    key: 'interviewTime',
    tag: '{{interviewTime}}',
    category: 'Interview',
    label: 'Interview Time',
    description: 'Scheduled interview start time',
    sampleValue: '10:00 AM',
  },
  {
    key: 'interviewMode',
    tag: '{{interviewMode}}',
    category: 'Interview',
    label: 'Interview Mode',
    description: 'Online video conference or Offline venue',
    sampleValue: 'Online',
  },
  {
    key: 'interviewLocation',
    tag: '{{interviewLocation}}',
    category: 'Interview',
    label: 'Interview Location / Venue',
    description: 'Physical campus hall room or virtual link',
    sampleValue: 'Seminar Hall A / Teams Link',
  },

  // Administrative Details
  {
    key: 'adminName',
    tag: '{{adminName}}',
    category: 'Administrative',
    label: 'Admin / Placement Officer',
    description: 'Name of the dispatching coordinator or officer',
    sampleValue: 'Placement Cell',
  },
  {
    key: 'adminContact',
    tag: '{{adminContact}}',
    category: 'Administrative',
    label: 'Admin Contact Info',
    description: 'Helpdesk phone or email contact',
    sampleValue: 'placements@college.edu',
  },
  {
    key: 'currentDate',
    tag: '{{currentDate}}',
    category: 'Administrative',
    label: 'Current Date',
    description: 'Today’s date formatted in formal English',
    sampleValue: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  },
];

export const VALID_PLACEHOLDER_KEYS = new Set(SUPPORTED_PLACEHOLDERS.map((p) => p.key));

export interface PlaceholderValidationResult {
  validPlaceholders: string[];
  invalidPlaceholders: string[];
  allFound: string[];
  isClean: boolean;
}

export interface PersonalizationResult {
  personalizedMessage: string;
  missingFields: string[];
  validationErrors: string[];
  status: 'VALID' | 'WARNING_MISSING_DATA' | 'INVALID_PLACEHOLDERS';
}

export class PlaceholderService {
  /**
   * Returns list of all supported placeholders with metadata
   */
  getSupportedPlaceholders(): PlaceholderDefinition[] {
    return SUPPORTED_PLACEHOLDERS;
  }

  /**
   * Extracts all {{...}} tokens from text
   */
  extractPlaceholders(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim())));
  }

  /**
   * Validates placeholders spelling in text
   */
  validateTemplate(text: string): PlaceholderValidationResult {
    const allFound = this.extractPlaceholders(text);
    const validPlaceholders: string[] = [];
    const invalidPlaceholders: string[] = [];

    for (const key of allFound) {
      if (VALID_PLACEHOLDER_KEYS.has(key)) {
        validPlaceholders.push(key);
      } else {
        invalidPlaceholders.push(key);
      }
    }

    return {
      validPlaceholders,
      invalidPlaceholders,
      allFound,
      isClean: invalidPlaceholders.length === 0,
    };
  }

  /**
   * Builds clean dictionary of variables from Candidate, Company, Metadata, and Admin
   */
  buildVariables(
    candidate: any,
    company: any,
    metadata?: any,
    admin?: any
  ): Record<string, string> {
    const fullName = candidate?.fullName?.trim() || '';
    const firstName = fullName ? fullName.split(/\s+/)[0] : '';
    const skillsJoined = Array.isArray(candidate?.skills)
      ? candidate.skills.filter(Boolean).join(', ')
      : candidate?.skills || '';

    // Date formatting helper
    const formatDate = (d: any) => {
      if (!d) return '';
      const parsed = new Date(d);
      return isNaN(parsed.getTime())
        ? String(d)
        : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const todayFormatted = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      candidateName: fullName,
      candidateFirstName: firstName,
      candidatePhone: candidate?.normalizedPhoneNumber || candidate?.phoneNumber || '',
      candidateEmail: candidate?.email || '',
      collegeName: candidate?.collegeName || '',
      degree: candidate?.degree || '',
      branch: candidate?.branch || '',
      passingYear: candidate?.passingYear ? String(candidate.passingYear) : '',
      skills: skillsJoined,

      companyName: company?.companyName || '',
      industry: company?.industry || '',
      jobRole: metadata?.customJobRole || company?.jobRole || '',
      jobDescription: company?.jobDescription || '',
      salaryPackage: company?.salaryPackage || '',
      jobLocation: company?.jobLocation || '',
      workMode: company?.workMode || '',

      interviewDate: metadata?.interviewDate || formatDate(company?.interviewDate),
      interviewTime: metadata?.interviewTime || '',
      interviewMode: metadata?.interviewMode || company?.interviewMode || '',
      interviewLocation: metadata?.interviewLocation || company?.interviewLocation || '',

      adminName: metadata?.adminName || admin?.name || 'Placement Cell',
      adminContact: metadata?.adminContact || admin?.email || '',
      currentDate: todayFormatted,
    };
  }

  /**
   * Generates sample variables for template preview
   */
  getSampleVariables(): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const p of SUPPORTED_PLACEHOLDERS) {
      vars[p.key] = p.sampleValue;
    }
    return vars;
  }

  /**
   * Personalizes template text and audits missing fields
   */
  personalizeAndValidate(
    templateText: string,
    variables: Record<string, string>
  ): PersonalizationResult {
    if (!templateText) {
      return {
        personalizedMessage: '',
        missingFields: [],
        validationErrors: [],
        status: 'VALID',
      };
    }

    const { invalidPlaceholders } = this.validateTemplate(templateText);
    const missingFields: string[] = [];
    const validationErrors: string[] = [];

    if (invalidPlaceholders.length > 0) {
      for (const inv of invalidPlaceholders) {
        validationErrors.push(`Unsupported or misspelled placeholder '{{${inv}}}'`);
      }
    }

    const personalized = templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
      if (!VALID_PLACEHOLDER_KEYS.has(key)) {
        return `[INVALID: {{${key}}}]`;
      }

      const val = variables[key];
      if (val !== undefined && val !== null && val.trim() !== '') {
        return val.trim();
      }

      // Record missing field
      missingFields.push(key);
      return `[MISSING: ${key}]`;
    });

    let status: 'VALID' | 'WARNING_MISSING_DATA' | 'INVALID_PLACEHOLDERS' = 'VALID';
    if (validationErrors.length > 0) {
      status = 'INVALID_PLACEHOLDERS';
    } else if (missingFields.length > 0) {
      status = 'WARNING_MISSING_DATA';
    }

    return {
      personalizedMessage: personalized,
      missingFields: Array.from(new Set(missingFields)),
      validationErrors,
      status,
    };
  }
}

export const placeholderService = new PlaceholderService();
