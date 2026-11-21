import * as xlsx from 'xlsx';
import { normalizePhoneNumber } from '../utils/phoneNormalizer';
import { Candidate } from '../models/Candidate.model';
import { isValidEmail } from '../utils/phoneNormalizer';

export interface ColumnMapping {
  fullName: string;
  phoneNumber: string;
  email?: string;
  collegeName?: string;
  degree?: string;
  branch?: string;
  passingYear?: string;
  skills?: string;
  experienceType?: string;
  placementStatus?: string;
  whatsappConsent?: string;
  consentSource?: string;
}

export interface ParsedSpreadsheetRow {
  rowNumber: number;
  raw: Record<string, any>;
  mapped: {
    fullName: string;
    phoneNumber: string;
    normalizedPhoneNumber: string;
    email: string;
    collegeName: string;
    degree: string;
    branch: string;
    passingYear?: number;
    skills: string[];
    experienceType: 'Fresher' | 'Experienced';
    placementStatus: 'Available' | 'Placed' | 'Inactive';
    whatsappConsent: boolean;
    whatsappConsentSource: string;
  };
  status: 'VALID_NEW' | 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | 'INVALID';
  errors: string[];
  existingCandidateId?: string;
  existingCandidateDbId?: string;
}

export interface SpreadsheetPreviewResult {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  totalRows: number;
  detectedMapping: ColumnMapping;
  sampleRows: Record<string, any>[];
}

export interface SpreadsheetParsedResult {
  totalRows: number;
  validNewCount: number;
  existingInDbCount: number;
  duplicateInFileCount: number;
  invalidCount: number;
  rows: ParsedSpreadsheetRow[];
}

/**
 * Detects standard candidate fields from column headers
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    fullName: '',
    phoneNumber: '',
    email: '',
    collegeName: '',
    degree: '',
    branch: '',
    passingYear: '',
    skills: '',
    experienceType: '',
    placementStatus: '',
    whatsappConsent: '',
  };

  const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const h of headers) {
    const norm = normalizeHeader(h);

    // Full name
    if (!mapping.fullName && (norm === 'fullname' || norm === 'name' || norm === 'studentname' || norm === 'candidatename' || norm === 'candidate')) {
      mapping.fullName = h;
    }
    // Phone
    else if (!mapping.phoneNumber && (norm === 'phonenumber' || norm === 'phone' || norm === 'mobile' || norm === 'mobilenumber' || norm === 'contact' || norm === 'whatsappnumber' || norm === 'whatsappno')) {
      mapping.phoneNumber = h;
    }
    // Email
    else if (!mapping.email && (norm === 'email' || norm === 'emailaddress' || norm === 'mail' || norm === 'studentemail')) {
      mapping.email = h;
    }
    // College
    else if (!mapping.collegeName && (norm === 'collegename' || norm === 'college' || norm === 'institute' || norm === 'university' || norm === 'campus')) {
      mapping.collegeName = h;
    }
    // Degree
    else if (!mapping.degree && (norm === 'degree' || norm === 'course' || norm === 'program' || norm === 'qualification')) {
      mapping.degree = h;
    }
    // Branch
    else if (!mapping.branch && (norm === 'branch' || norm === 'department' || norm === 'stream' || norm === 'specialization')) {
      mapping.branch = h;
    }
    // Passing Year
    else if (!mapping.passingYear && (norm === 'passingyear' || norm === 'graduationyear' || norm === 'batch' || norm === 'yearofpassing' || norm === 'year')) {
      mapping.passingYear = h;
    }
    // Skills
    else if (!mapping.skills && (norm === 'skills' || norm === 'keyskills' || norm === 'technicalskills' || norm === 'technologies')) {
      mapping.skills = h;
    }
    // Experience Type
    else if (!mapping.experienceType && (norm === 'experiencetype' || norm === 'experience' || norm === 'type')) {
      mapping.experienceType = h;
    }
    // Placement Status
    else if (!mapping.placementStatus && (norm === 'placementstatus' || norm === 'placement' || norm === 'status')) {
      mapping.placementStatus = h;
    }
    // Consent
    else if (!mapping.whatsappConsent && (norm === 'whatsappconsent' || norm === 'consent' || norm === 'whatsappoptin' || norm === 'optin')) {
      mapping.whatsappConsent = h;
    }
  }

  return mapping;
}

/**
 * Inspects spreadsheet buffer and returns headers, detected mapping, and row samples
 */
export function inspectSpreadsheet(buffer: Buffer, requestedSheet?: string): SpreadsheetPreviewResult {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Spreadsheet has no sheets');
  }

  const activeSheet = requestedSheet && sheetNames.includes(requestedSheet) ? requestedSheet : sheetNames[0];
  const sheet = workbook.Sheets[activeSheet];
  const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  // Extract headers
  let headers: string[] = [];
  if (rawRows.length > 0) {
    headers = Object.keys(rawRows[0]);
  } else {
    // If no data rows, read range from sheet
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[xlsx.utils.encode_cell({ r: range.s.r, c: col })];
      if (cell && cell.v) headers.push(String(cell.v).trim());
    }
  }

  const detectedMapping = autoDetectColumnMapping(headers);

  return {
    sheetNames,
    activeSheet,
    headers,
    totalRows: rawRows.length,
    detectedMapping,
    sampleRows: rawRows.slice(0, 5),
  };
}

/**
 * Parses and validates all rows using provided column mapping
 */
export async function parseSpreadsheetWithMapping(
  buffer: Buffer,
  mapping: ColumnMapping,
  requestedSheet?: string
): Promise<SpreadsheetParsedResult> {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = requestedSheet && workbook.SheetNames.includes(requestedSheet)
    ? requestedSheet
    : workbook.SheetNames[0];
  const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  // Collect phone numbers to query DB in one efficient lookup
  const phonesToQuery: string[] = [];
  for (const row of rawRows) {
    const rawPhone = String(row[mapping.phoneNumber] || '').trim();
    if (rawPhone) {
      const norm = normalizePhoneNumber(rawPhone);
      if (norm.isValid) {
        phonesToQuery.push(norm.normalized);
      }
    }
  }

  const existingDocs = await Candidate.find({
    normalizedPhoneNumber: { $in: phonesToQuery },
  })
    .select('_id normalizedPhoneNumber fullName candidateId')
    .lean();

  const dbPhoneMap = new Map<string, { _id: string; candidateId: string; fullName: string }>();
  for (const doc of existingDocs) {
    dbPhoneMap.set(doc.normalizedPhoneNumber, {
      _id: String(doc._id),
      candidateId: doc.candidateId,
      fullName: doc.fullName,
    });
  }

  const parsedRows: ParsedSpreadsheetRow[] = [];
  const seenInBatch = new Set<string>();

  let validNewCount = 0;
  let existingInDbCount = 0;
  let duplicateInFileCount = 0;
  let invalidCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNumber = idx + 2;
    const errors: string[] = [];

    const fullName = String(row[mapping.fullName] || '').trim();
    const rawPhone = String(row[mapping.phoneNumber] || '').trim();
    const rawEmail = mapping.email ? String(row[mapping.email] || '').trim() : '';

    if (!fullName) {
      errors.push('Full Name is required');
    }

    if (!rawPhone) {
      errors.push('Phone number is required');
    }

    const phoneNorm = normalizePhoneNumber(rawPhone);
    if (rawPhone && !phoneNorm.isValid) {
      errors.push(phoneNorm.error || 'Invalid phone number format');
    }

    if (rawEmail && !isValidEmail(rawEmail)) {
      errors.push(`Invalid email format: ${rawEmail}`);
    }

    // Consent extraction
    const rawConsent = mapping.whatsappConsent
      ? String(row[mapping.whatsappConsent] || '').trim().toLowerCase()
      : '';
    const hasConsent = ['yes', 'true', '1', 'y', 'granted'].includes(rawConsent);
    const consentSource = hasConsent
      ? (mapping.consentSource && row[mapping.consentSource] ? String(row[mapping.consentSource]).trim() : 'Spreadsheet Import')
      : '';

    // Skills
    const skillsRaw = mapping.skills ? String(row[mapping.skills] || '').trim() : '';
    const skills = skillsRaw
      ? skillsRaw.split(/[,;|]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    // Passing Year
    const rawYear = mapping.passingYear ? parseInt(String(row[mapping.passingYear] || ''), 10) : undefined;
    const passingYear = rawYear && !isNaN(rawYear) ? rawYear : undefined;

    // Experience Type
    const rawExp = mapping.experienceType ? String(row[mapping.experienceType] || '').trim().toLowerCase() : '';
    const experienceType = rawExp === 'experienced' ? 'Experienced' : 'Fresher';

    // Placement Status
    const rawPlacement = mapping.placementStatus ? String(row[mapping.placementStatus] || '').trim().toLowerCase() : '';
    let placementStatus: 'Available' | 'Placed' | 'Inactive' = 'Available';
    if (rawPlacement === 'placed') placementStatus = 'Placed';
    if (rawPlacement === 'inactive') placementStatus = 'Inactive';

    const mapped = {
      fullName,
      phoneNumber: rawPhone,
      normalizedPhoneNumber: phoneNorm.normalized || '',
      email: rawEmail ? rawEmail.toLowerCase() : '',
      collegeName: mapping.collegeName ? String(row[mapping.collegeName] || '').trim() : '',
      degree: mapping.degree ? String(row[mapping.degree] || '').trim() : '',
      branch: mapping.branch ? String(row[mapping.branch] || '').trim() : '',
      passingYear,
      skills,
      experienceType: experienceType as 'Fresher' | 'Experienced',
      placementStatus,
      whatsappConsent: hasConsent,
      whatsappConsentSource: consentSource,
    };

    let status: 'VALID_NEW' | 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | 'INVALID' = 'VALID_NEW';
    let existingCandidateId: string | undefined;
    let existingCandidateDbId: string | undefined;

    if (errors.length > 0) {
      status = 'INVALID';
      invalidCount++;
    } else if (seenInBatch.has(phoneNorm.normalized)) {
      status = 'DUPLICATE_IN_FILE';
      errors.push(`Duplicate phone number within this import file (${phoneNorm.normalized})`);
      duplicateInFileCount++;
    } else if (dbPhoneMap.has(phoneNorm.normalized)) {
      status = 'EXISTING_IN_DB';
      const existing = dbPhoneMap.get(phoneNorm.normalized)!;
      existingCandidateId = existing.candidateId;
      existingCandidateDbId = existing._id;
      existingInDbCount++;
      seenInBatch.add(phoneNorm.normalized);
    } else {
      status = 'VALID_NEW';
      validNewCount++;
      seenInBatch.add(phoneNorm.normalized);
    }

    parsedRows.push({
      rowNumber,
      raw: row,
      mapped,
      status,
      errors,
      existingCandidateId,
      existingCandidateDbId,
    });
  }

  return {
    totalRows: parsedRows.length,
    validNewCount,
    existingInDbCount,
    duplicateInFileCount,
    invalidCount,
    rows: parsedRows,
  };
}

