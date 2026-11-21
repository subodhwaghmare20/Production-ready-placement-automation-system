import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Candidate, ICandidate } from '../models/Candidate.model';
import { FetchOperationHistory } from '../models/FetchOperationHistory.model';
import {
  inspectSpreadsheet,
  parseSpreadsheetWithMapping,
  ColumnMapping,
} from '../services/spreadsheetParser.service';
import {
  validatePastedNumbers,
  createCandidatesFromUnknownNumbers,
  matchCandidates,
  resolveGroupRecipientReadiness,
} from '../services/contactFetcher.service';
import { assignCandidatesToVirtualGroup } from '../services/candidateAssignment.service';
import { generateOperationCsvReport } from '../services/assignmentReport.service';
import { generateCandidateId, generateFetchOperationId } from '../utils/idGenerator';

/**
 * POST /api/contact-fetcher/preview
 * Analyzes uploaded spreadsheet and returns sheet names, headers, suggested column mapping, and sample rows
 */
export const previewSpreadsheetFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
      return;
    }

    const { sheet } = req.body;
    const preview = inspectSpreadsheet(req.file.buffer, sheet);

    res.status(200).json({
      success: true,
      message: 'Spreadsheet inspected successfully',
      data: preview,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to inspect spreadsheet file',
    });
  }
};

/**
 * POST /api/contact-fetcher/parse
 * Parses uploaded spreadsheet using column mapping, validates candidates, and optionally registers valid ones
 */
export const parseSpreadsheetFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
      return;
    }

    let mapping: ColumnMapping;
    try {
      mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
    } catch {
      res.status(400).json({ success: false, message: 'Invalid column mapping format' });
      return;
    }

    if (!mapping || !mapping.fullName || !mapping.phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'Column mapping must specify at least Full Name and Phone Number columns',
      });
      return;
    }

    const autoCreate = req.body.autoCreate === 'true' || req.body.autoCreate === true;
    const parsed = await parseSpreadsheetWithMapping(req.file.buffer, mapping, req.body.sheet);

    // If autoCreate is true, insert VALID_NEW candidates into MongoDB
    let createdCount = 0;
    if (autoCreate && parsed.validNewCount > 0) {
      const candidatesToInsert = parsed.rows
        .filter((r) => r.status === 'VALID_NEW')
        .map((r) => ({
          candidateId: generateCandidateId(r.mapped.passingYear),
          fullName: r.mapped.fullName,
          phoneNumber: r.mapped.phoneNumber,
          normalizedPhoneNumber: r.mapped.normalizedPhoneNumber,
          email: r.mapped.email,
          collegeName: r.mapped.collegeName,
          degree: r.mapped.degree,
          branch: r.mapped.branch,
          passingYear: r.mapped.passingYear,
          skills: r.mapped.skills,
          experienceType: r.mapped.experienceType,
          placementStatus: r.mapped.placementStatus,
          whatsappConsent: r.mapped.whatsappConsent,
          whatsappConsentAt: r.mapped.whatsappConsent ? new Date() : undefined,
          whatsappConsentSource: r.mapped.whatsappConsentSource || 'Spreadsheet Import',
        }));

      if (candidatesToInsert.length > 0) {
        const inserted = await Candidate.insertMany(candidatesToInsert);
        createdCount = inserted.length;

        // Update the parsed row references with their new DB IDs
        const insertedMap = new Map(inserted.map((doc) => [doc.normalizedPhoneNumber, doc]));
        for (const r of parsed.rows) {
          if (r.status === 'VALID_NEW' && insertedMap.has(r.mapped.normalizedPhoneNumber)) {
            const doc = insertedMap.get(r.mapped.normalizedPhoneNumber)!;
            r.existingCandidateId = doc.candidateId;
            r.existingCandidateDbId = String(doc._id);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Parsed ${parsed.totalRows} rows (${parsed.validNewCount} new, ${parsed.existingInDbCount} existing in database, ${createdCount} registered)`,
      data: {
        ...parsed,
        createdCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contact-fetcher/candidates
 * Advanced multi-criteria search for candidates in MongoDB with backend pagination
 */
export const searchCandidatesDatabase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Text search (matches fullName, phoneNumber, normalizedPhoneNumber, email, candidateId)
    if (req.query.search) {
      const q = String(req.query.search).trim();
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { phoneNumber: { $regex: q, $options: 'i' } },
        { normalizedPhoneNumber: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { candidateId: { $regex: q, $options: 'i' } },
        { collegeName: { $regex: q, $options: 'i' } },
      ];
    }

    if (req.query.college) {
      query.collegeName = { $regex: String(req.query.college).trim(), $options: 'i' };
    }

    if (req.query.degree) {
      query.degree = { $regex: String(req.query.degree).trim(), $options: 'i' };
    }

    if (req.query.branch) {
      query.branch = { $regex: String(req.query.branch).trim(), $options: 'i' };
    }

    if (req.query.passingYear) {
      query.passingYear = parseInt(String(req.query.passingYear), 10);
    }

    if (req.query.experienceType) {
      query.experienceType = String(req.query.experienceType);
    }

    if (req.query.placementStatus) {
      query.placementStatus = String(req.query.placementStatus);
    }

    if (req.query.whatsappConsent !== undefined && req.query.whatsappConsent !== '') {
      query.whatsappConsent = String(req.query.whatsappConsent).toLowerCase() === 'true';
    }

    if (req.query.skills) {
      const skillsArr = Array.isArray(req.query.skills)
        ? (req.query.skills as string[])
        : String(req.query.skills).split(',').map((s) => s.trim()).filter(Boolean);
      if (skillsArr.length > 0) {
        query.skills = { $in: skillsArr.map((s) => new RegExp(s, 'i')) };
      }
    }

    const [total, candidates] = await Promise.all([
      Candidate.countDocuments(query),
      Candidate.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        candidates,
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
 * POST /api/contact-fetcher/validate-numbers
 * Validates raw pasted phone numbers, normalizes to E.164, removes duplicates, and matches against DB
 */
export const validateNumbers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, message: 'Please provide phone number text to validate' });
      return;
    }

    const result = await validatePastedNumbers(text);

    res.status(200).json({
      success: true,
      message: `Processed ${result.totalParsed} numbers (${result.existingCount} found in database, ${result.unknownCount} new, ${result.invalidCount} invalid)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contact-fetcher/create-from-unknown
 * Allows creating candidates for unknown phone numbers with administrator-supplied profiles
 */
export const createFromUnknown = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { candidates } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide an array of candidate records to create' });
      return;
    }

    const result = await createCandidatesFromUnknownNumbers(candidates, req.admin?._id ? String(req.admin._id) : undefined);

    res.status(201).json({
      success: true,
      message: `Created ${result.created.length} new candidates (${result.failed.length} failed)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contact-fetcher/match-company
 * Categorizes a set of candidate IDs into Category A (Eligible), B (Partially Matching), C (Not Eligible)
 */
export const matchCompanyRequirements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { candidateIds, companyId, groupId } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide candidate IDs to evaluate' });
      return;
    }

    const targetId = companyId || groupId;
    if (!targetId) {
      res.status(400).json({ success: false, message: 'Please provide target companyId or groupId' });
      return;
    }

    const result = await matchCandidates(candidateIds, targetId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to match candidate requirements',
    });
  }
};

/**
 * POST /api/contact-fetcher/assign
 * Performs smart assignment of candidates to a Virtual Group with comprehensive rule verification
 */
export const assignCandidates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId, candidateIds, sourceType = 'DATABASE', allowPlaced = false, allowInactive = false } = req.body;

    if (!groupId) {
      res.status(400).json({ success: false, message: 'Target virtual groupId is required' });
      return;
    }

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      res.status(400).json({ success: false, message: 'Please select at least one candidate to assign' });
      return;
    }

    const result = await assignCandidatesToVirtualGroup({
      groupId,
      candidateIds,
      sourceType,
      adminId: req.admin?._id ? String(req.admin._id) : undefined,
      adminName: req.admin?.name || 'Placement Admin',
      allowPlaced: Boolean(allowPlaced),
      allowInactive: Boolean(allowInactive),
    });

    res.status(200).json({
      success: true,
      message: `Assigned ${result.newlyAssigned + result.reactivated} candidates to ${result.groupName}`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign candidates to virtual group',
    });
  }
};

/**
 * GET /api/contact-fetcher/history
 * Retrieves paginated operation audit history of fetch & assignment executions
 */
export const getFetchHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (req.query.sourceType) {
      query.sourceType = req.query.sourceType;
    }

    const [total, history] = await Promise.all([
      FetchOperationHistory.countDocuments(query),
      FetchOperationHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-reportData.rejected -reportData.skipped -reportData.assigned'), // Exclude bulky rows for list
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        history,
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
 * GET /api/contact-fetcher/history/:id
 * Retrieves single operation details including report data
 */
export const getOperationDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { operationId: id };

    const operation = await FetchOperationHistory.findOne(query);
    if (!operation) {
      res.status(404).json({ success: false, message: 'Operation record not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: operation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contact-fetcher/reports/:id/download
 * Generates and downloads downloadable CSV report of rejected, skipped, and assigned records
 */
export const downloadOperationReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { operationId: id };

    const operation = await FetchOperationHistory.findOne(query);
    if (!operation) {
      res.status(404).json({ success: false, message: 'Operation record not found' });
      return;
    }

    const csvContent = generateOperationCsvReport(operation);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${operation.operationId}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contact-fetcher/recipient-readiness/:groupId
 * Evaluates Section 11 WhatsApp integration readiness for a selected virtual group
 */
export const getRecipientReadiness = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const readiness = await resolveGroupRecipientReadiness(groupId);

    res.status(200).json({
      success: true,
      data: readiness,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to resolve recipient readiness',
    });
  }
};

