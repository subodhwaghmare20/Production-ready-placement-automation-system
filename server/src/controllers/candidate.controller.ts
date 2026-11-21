import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import { Candidate, ICandidate, PlacementStatus, ExperienceType } from '../models/Candidate.model';
import { normalizePhoneNumber, isValidEmail } from '../utils/phoneNormalizer';
import { generateCandidateId } from '../utils/idGenerator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * POST /api/candidates
 * Create a new candidate with normalized phone number and explicit consent
 */
export const createCandidate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      gender,
      collegeName,
      degree,
      branch,
      passingYear,
      skills,
      experienceType,
      experienceYears,
      resumeUrl,
      resumeOriginalName,
      resumeMimeType,
      resumeFileSize,
      placementStatus,
      whatsappConsent,
      whatsappConsentSource,
      notes,
    } = req.body;

    if (!fullName || !fullName.trim()) {
      res.status(400).json({ success: false, message: 'Full name is required' });
      return;
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      res.status(400).json({ success: false, message: 'Phone number is required' });
      return;
    }

    // Phone validation & normalization
    const phoneResult = normalizePhoneNumber(phoneNumber);
    if (!phoneResult.isValid) {
      res.status(400).json({
        success: false,
        message: phoneResult.error || 'Invalid phone number format',
      });
      return;
    }

    // Check duplicate phone number in database
    const existing = await Candidate.findOne({
      normalizedPhoneNumber: phoneResult.normalized,
    });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `Candidate already registered with phone number ${phoneResult.normalized} (Candidate ID: ${existing.candidateId})`,
      });
      return;
    }

    // Email validation if provided
    if (email && !isValidEmail(email)) {
      res.status(400).json({ success: false, message: 'Invalid email address format' });
      return;
    }

    // Explicit WhatsApp Consent Handling
    const hasConsent = Boolean(whatsappConsent);
    const consentDate = hasConsent ? new Date() : undefined;
    const consentSource = hasConsent ? (whatsappConsentSource || 'Manual Admin Entry') : '';

    const newCandidate = new Candidate({
      candidateId: generateCandidateId(passingYear ? Number(passingYear) : undefined),
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      normalizedPhoneNumber: phoneResult.normalized,
      email: email ? email.trim().toLowerCase() : '',
      gender: gender || '',
      collegeName: collegeName ? collegeName.trim() : '',
      degree: degree ? degree.trim() : '',
      branch: branch ? branch.trim() : '',
      passingYear: passingYear ? Number(passingYear) : undefined,
      skills: Array.isArray(skills)
        ? skills.map((s: string) => s.trim()).filter(Boolean)
        : typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      experienceType: (experienceType as ExperienceType) || 'Fresher',
      experienceYears: experienceYears ? Number(experienceYears) : 0,
      resumeUrl: resumeUrl || '',
      resumeOriginalName: resumeOriginalName || '',
      resumeMimeType: resumeMimeType || '',
      resumeFileSize: resumeFileSize || undefined,
      placementStatus: (placementStatus as PlacementStatus) || 'Available',
      whatsappConsent: hasConsent,
      whatsappConsentAt: consentDate,
      whatsappConsentSource: consentSource,
      notes: notes ? notes.trim() : '',
    });

    await newCandidate.save();

    res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      data: newCandidate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/candidates
 * Paginated candidate search and multi-criteria filtering
 */
export const getCandidates = async (
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
      branch,
      passingYear,
      degree,
      skills,
      placementStatus,
      experienceType,
      whatsappConsent,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter: Record<string, any> = {};

    // Search query across name, candidateId, phone, email, and branch
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { candidateId: searchRegex },
        { phoneNumber: searchRegex },
        { normalizedPhoneNumber: searchRegex },
        { email: searchRegex },
        { branch: searchRegex },
        { collegeName: searchRegex },
      ];
    }

    if (branch && typeof branch === 'string' && branch.trim()) {
      filter.branch = new RegExp(`^${branch.trim()}$`, 'i');
    }

    if (passingYear) {
      filter.passingYear = Number(passingYear);
    }

    if (degree && typeof degree === 'string' && degree.trim()) {
      filter.degree = new RegExp(`^${degree.trim()}$`, 'i');
    }

    if (placementStatus && typeof placementStatus === 'string' && placementStatus.trim()) {
      filter.placementStatus = placementStatus.trim();
    }

    if (experienceType && typeof experienceType === 'string' && experienceType.trim()) {
      filter.experienceType = experienceType.trim();
    }

    if (whatsappConsent !== undefined && whatsappConsent !== '') {
      filter.whatsappConsent = whatsappConsent === 'true' || whatsappConsent === '1';
    }

    if (skills && typeof skills === 'string' && skills.trim()) {
      const skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (skillsArray.length > 0) {
        filter.skills = { $in: skillsArray.map((s) => new RegExp(s, 'i')) };
      }
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';

    const [total, candidates] = await Promise.all([
      Candidate.countDocuments(filter),
      Candidate.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

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
 * GET /api/candidates/stats
 * Aggregate candidate metrics
 */
export const getCandidateStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalCandidates,
      availableCandidates,
      placedCandidates,
      inactiveCandidates,
      whatsappConsentCount,
      fresherCount,
      experiencedCount,
    ] = await Promise.all([
      Candidate.countDocuments(),
      Candidate.countDocuments({ placementStatus: 'Available' }),
      Candidate.countDocuments({ placementStatus: 'Placed' }),
      Candidate.countDocuments({ placementStatus: 'Inactive' }),
      Candidate.countDocuments({ whatsappConsent: true }),
      Candidate.countDocuments({ experienceType: 'Fresher' }),
      Candidate.countDocuments({ experienceType: 'Experienced' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        availableCandidates,
        placedCandidates,
        inactiveCandidates,
        whatsappConsentCount,
        fresherCount,
        experiencedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/candidates/export
 * Exports filtered candidates to CSV / Excel spreadsheet format
 */
export const exportCandidates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { branch, passingYear, degree, placementStatus, experienceType, whatsappConsent, format = 'csv' } = req.query;

    const filter: Record<string, any> = {};
    if (branch) filter.branch = new RegExp(`^${(branch as string).trim()}$`, 'i');
    if (passingYear) filter.passingYear = Number(passingYear);
    if (degree) filter.degree = new RegExp(`^${(degree as string).trim()}$`, 'i');
    if (placementStatus) filter.placementStatus = (placementStatus as string).trim();
    if (experienceType) filter.experienceType = (experienceType as string).trim();
    if (whatsappConsent !== undefined && whatsappConsent !== '') {
      filter.whatsappConsent = whatsappConsent === 'true' || whatsappConsent === '1';
    }

    const candidates = await Candidate.find(filter).sort({ createdAt: -1 }).lean();

    const rows = candidates.map((c) => ({
      'Candidate ID': c.candidateId,
      'Full Name': c.fullName,
      'Phone Number': c.phoneNumber,
      'Normalized Phone': c.normalizedPhoneNumber,
      'Email': c.email || '',
      'Gender': c.gender || '',
      'College Name': c.collegeName || '',
      'Degree': c.degree || '',
      'Branch': c.branch || '',
      'Passing Year': c.passingYear || '',
      'Skills': Array.isArray(c.skills) ? c.skills.join(', ') : '',
      'Experience Type': c.experienceType,
      'Experience Years': c.experienceYears || 0,
      'Placement Status': c.placementStatus,
      'WhatsApp Consent': c.whatsappConsent ? 'Granted' : 'Not Granted',
      'Consent Date': c.whatsappConsentAt ? new Date(c.whatsappConsentAt).toISOString().split('T')[0] : '',
      'Consent Source': c.whatsappConsentSource || '',
      'Created Date': new Date(c.createdAt).toISOString().split('T')[0],
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Candidates');

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'xlsx') {
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="candidates-export-${timestamp}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="candidates-export-${timestamp}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/candidates/sample-template
 * Download sample Excel / CSV template for bulk import
 */
export const getSampleTemplate = (
  req: Request,
  res: Response
): void => {
  const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

  const sampleData = [
    {
      'Full Name': 'Aarav Sharma',
      'Phone Number': '9876543210',
      'Email': 'aarav.sharma@example.com',
      'Gender': 'Male',
      'College Name': 'State Institute of Technology',
      'Degree': 'B.Tech',
      'Branch': 'Computer Science',
      'Passing Year': 2026,
      'Skills': 'JavaScript, React, Node.js, Python',
      'Experience Type': 'Fresher',
      'Experience Years': 0,
      'Placement Status': 'Available',
      'WhatsApp Consent': 'Yes',
      'Consent Source': 'College Placement Registration Form 2026',
      'Notes': 'Top performer in Hackathon',
    },
    {
      'Full Name': 'Priya Patel',
      'Phone Number': '+91 98765 12345',
      'Email': 'priya.patel@example.com',
      'Gender': 'Female',
      'College Name': 'National College of Engineering',
      'Degree': 'B.E.',
      'Branch': 'Information Technology',
      'Passing Year': 2026,
      'Skills': 'Java, Spring Boot, SQL, AWS',
      'Experience Type': 'Fresher',
      'Experience Years': 0,
      'Placement Status': 'Available',
      'WhatsApp Consent': 'No',
      'Consent Source': '',
      'Notes': '',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sample_Candidates');

  if (format === 'csv') {
    const csvContent = xlsx.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="candidate_import_sample.csv"');
    res.send(csvContent);
  } else {
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="candidate_import_sample.xlsx"');
    res.send(buffer);
  }
};

/**
 * GET /api/candidates/:id
 * Retrieve candidate details by MongoDB _id or candidateId
 */
export const getCandidateById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = mongoose.isValidObjectId(id)
      ? { _id: id }
      : { candidateId: id };

    const candidate = await Candidate.findOne(query);
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/candidates/:id
 * Update candidate record
 */
export const updateCandidate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { candidateId: id };

    const candidate = await Candidate.findOne(query);
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    const {
      fullName,
      phoneNumber,
      email,
      gender,
      collegeName,
      degree,
      branch,
      passingYear,
      skills,
      experienceType,
      experienceYears,
      resumeUrl,
      resumeOriginalName,
      resumeMimeType,
      resumeFileSize,
      placementStatus,
      whatsappConsent,
      whatsappConsentSource,
      notes,
    } = req.body;

    if (fullName !== undefined) candidate.fullName = fullName.trim();

    // Check phone number change
    if (phoneNumber !== undefined && phoneNumber !== candidate.phoneNumber) {
      const phoneResult = normalizePhoneNumber(phoneNumber);
      if (!phoneResult.isValid) {
        res.status(400).json({ success: false, message: phoneResult.error || 'Invalid phone format' });
        return;
      }

      // Check duplicate
      const duplicate = await Candidate.findOne({
        normalizedPhoneNumber: phoneResult.normalized,
        _id: { $ne: candidate._id },
      });
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `Phone number ${phoneResult.normalized} is already in use by Candidate ${duplicate.candidateId}`,
        });
        return;
      }

      candidate.phoneNumber = phoneNumber.trim();
      candidate.normalizedPhoneNumber = phoneResult.normalized;
    }

    if (email !== undefined) {
      if (email && !isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email address' });
        return;
      }
      candidate.email = email.trim().toLowerCase();
    }

    if (gender !== undefined) candidate.gender = gender;
    if (collegeName !== undefined) candidate.collegeName = collegeName.trim();
    if (degree !== undefined) candidate.degree = degree.trim();
    if (branch !== undefined) candidate.branch = branch.trim();
    if (passingYear !== undefined) candidate.passingYear = Number(passingYear) || undefined;

    if (skills !== undefined) {
      candidate.skills = Array.isArray(skills)
        ? skills.map((s: string) => s.trim()).filter(Boolean)
        : typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }

    if (experienceType !== undefined) candidate.experienceType = experienceType as ExperienceType;
    if (experienceYears !== undefined) candidate.experienceYears = Number(experienceYears) || 0;
    if (resumeUrl !== undefined) candidate.resumeUrl = resumeUrl;
    if (resumeOriginalName !== undefined) candidate.resumeOriginalName = resumeOriginalName;
    if (resumeMimeType !== undefined) candidate.resumeMimeType = resumeMimeType;
    if (resumeFileSize !== undefined) candidate.resumeFileSize = Number(resumeFileSize) || undefined;
    if (placementStatus !== undefined) candidate.placementStatus = placementStatus as PlacementStatus;

    // Consent update tracking
    if (whatsappConsent !== undefined) {
      const newConsent = Boolean(whatsappConsent);
      if (newConsent && !candidate.whatsappConsent) {
        candidate.whatsappConsentAt = new Date();
        candidate.whatsappConsentSource = whatsappConsentSource || 'Admin Manual Update';
      } else if (!newConsent) {
        candidate.whatsappConsentAt = undefined;
      }
      candidate.whatsappConsent = newConsent;
    }
    if (whatsappConsentSource !== undefined && candidate.whatsappConsent) {
      candidate.whatsappConsentSource = whatsappConsentSource;
    }

    if (notes !== undefined) candidate.notes = notes.trim();

    await candidate.save();

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/candidates/:id
 * Removes a candidate record
 */
export const deleteCandidate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { candidateId: id };

    const candidate = await Candidate.findOne(query);
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    // Remove stored resume file if exists
    if (candidate.resumeUrl) {
      const filePath = path.resolve(__dirname, '../../uploads/resumes', candidate.resumeUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Candidate.deleteOne({ _id: candidate._id });

    res.status(200).json({
      success: true,
      message: `Candidate ${candidate.fullName} (${candidate.candidateId}) removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/candidates/upload-resume
 * Uploads candidate resume file (PDF, DOC, DOCX up to 10MB)
 */
export const uploadResume = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please attach a resume file' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/candidates/:id/resume
 * Authorized streaming of candidate resume
 */
export const getResume = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { candidateId: id };

    const candidate = await Candidate.findOne(query);
    if (!candidate || !candidate.resumeUrl) {
      res.status(404).json({ success: false, message: 'Candidate resume not found' });
      return;
    }

    const filePath = path.resolve(__dirname, '../../uploads/resumes', candidate.resumeUrl);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'Resume file missing on server' });
      return;
    }

    res.setHeader('Content-Type', candidate.resumeMimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${candidate.resumeOriginalName || candidate.resumeUrl}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/candidates/bulk-import/preview
 * Parses uploaded spreadsheet file, validates rows, detects duplicates, and generates preview
 */
export const previewBulkImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
      return;
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ success: false, message: 'The uploaded spreadsheet has no sheets' });
      return;
    }

    const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
    });

    if (rawRows.length === 0) {
      res.status(400).json({ success: false, message: 'Spreadsheet contains no data rows' });
      return;
    }

    const validRecords: any[] = [];
    const rejectedRecords: { rowNumber: number; data: Record<string, any>; reason: string }[] = [];
    const seenNormalizedInBatch = new Set<string>();

    // First collect all candidate phone numbers to query DB in one batch
    const candidatePhonesToQuery: string[] = [];
    for (const row of rawRows) {
      const rawPhone = String(
        row['Phone Number'] || row['phone'] || row['Phone'] || row['Mobile'] || ''
      );
      const norm = normalizePhoneNumber(rawPhone);
      if (norm.isValid) {
        candidatePhonesToQuery.push(norm.normalized);
      }
    }

    // Query all existing phones from database in one efficient query
    const existingInDb = await Candidate.find({
      normalizedPhoneNumber: { $in: candidatePhonesToQuery },
    })
      .select('normalizedPhoneNumber fullName candidateId')
      .lean();

    const dbPhoneMap = new Map<string, { candidateId: string; fullName: string }>();
    for (const doc of existingInDb) {
      dbPhoneMap.set(doc.normalizedPhoneNumber, {
        candidateId: doc.candidateId,
        fullName: doc.fullName,
      });
    }

    // Process and validate each row
    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowNum = index + 2; // Row number in spreadsheet (accounting for 1-based header)

      const fullName = String(
        row['Full Name'] || row['Name'] || row['name'] || row['fullName'] || ''
      ).trim();

      const rawPhone = String(
        row['Phone Number'] || row['phone'] || row['Phone'] || row['Mobile'] || ''
      ).trim();

      const email = String(
        row['Email'] || row['email'] || row['Email Address'] || ''
      ).trim();

      // Check required Name
      if (!fullName) {
        rejectedRecords.push({
          rowNumber: rowNum,
          data: row,
          reason: 'Full Name is missing or empty',
        });
        continue;
      }

      // Check required Phone
      if (!rawPhone) {
        rejectedRecords.push({
          rowNumber: rowNum,
          data: row,
          reason: 'Phone number is missing',
        });
        continue;
      }

      // Validate and normalize phone
      const phoneNorm = normalizePhoneNumber(rawPhone);
      if (!phoneNorm.isValid) {
        rejectedRecords.push({
          rowNumber: rowNum,
          data: row,
          reason: phoneNorm.error || 'Invalid phone format',
        });
        continue;
      }

      // Check duplicate within the same file batch
      if (seenNormalizedInBatch.has(phoneNorm.normalized)) {
        rejectedRecords.push({
          rowNumber: rowNum,
          data: row,
          reason: `Duplicate phone number within this import file (${phoneNorm.normalized})`,
        });
        continue;
      }

      // Check duplicate against existing database records
      if (dbPhoneMap.has(phoneNorm.normalized)) {
        const existingDoc = dbPhoneMap.get(phoneNorm.normalized)!;
        rejectedRecords.push({
          rowNumber: rowNum,
          data: row,
          reason: `Candidate already exists in database with this phone number (${existingDoc.fullName} - ${existingDoc.candidateId})`,
        });
        continue;
      }

      // Email validation if present
      if (email && !isValidEmail(email)) {
        rejectedRecords.push({
          rowNumber: rowNum,
          data: row,
          reason: `Invalid email format: ${email}`,
        });
        continue;
      }

      // WhatsApp consent extraction (strictly requiring explicit 'yes' / 'true' / 'granted')
      const rawConsent = String(
        row['WhatsApp Consent'] || row['whatsappConsent'] || row['Consent'] || ''
      ).trim().toLowerCase();
      const hasConsent = ['yes', 'true', '1', 'y', 'granted'].includes(rawConsent);
      const consentSource = hasConsent
        ? String(row['Consent Source'] || row['whatsappConsentSource'] || 'Bulk File Import').trim()
        : '';

      const skillsRaw = String(row['Skills'] || row['skills'] || '');
      const skills = skillsRaw
        ? skillsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const passingYear = parseInt(
        String(row['Passing Year'] || row['passingYear'] || row['Graduation Year'] || ''),
        10
      );

      const expTypeRaw = String(row['Experience Type'] || row['experienceType'] || '').trim();
      const experienceType: ExperienceType =
        expTypeRaw.toLowerCase() === 'experienced' ? 'Experienced' : 'Fresher';

      const expYears = parseFloat(String(row['Experience Years'] || row['experienceYears'] || '0')) || 0;

      const placementRaw = String(row['Placement Status'] || row['placementStatus'] || '').trim();
      let placementStatus: PlacementStatus = 'Available';
      if (['placed', 'inactive'].includes(placementRaw.toLowerCase())) {
        placementStatus = (placementRaw.charAt(0).toUpperCase() + placementRaw.slice(1).toLowerCase()) as PlacementStatus;
      }

      seenNormalizedInBatch.add(phoneNorm.normalized);

      validRecords.push({
        fullName,
        phoneNumber: rawPhone,
        normalizedPhoneNumber: phoneNorm.normalized,
        email: email ? email.toLowerCase() : '',
        gender: String(row['Gender'] || row['gender'] || '').trim(),
        collegeName: String(row['College Name'] || row['collegeName'] || row['College'] || '').trim(),
        degree: String(row['Degree'] || row['degree'] || '').trim(),
        branch: String(row['Branch'] || row['branch'] || '').trim(),
        passingYear: isNaN(passingYear) ? undefined : passingYear,
        skills,
        experienceType,
        experienceYears: expYears,
        placementStatus,
        whatsappConsent: hasConsent,
        whatsappConsentAt: hasConsent ? new Date() : undefined,
        whatsappConsentSource: consentSource,
        notes: String(row['Notes'] || row['notes'] || '').trim(),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRows: rawRows.length,
          validCount: validRecords.length,
          rejectedCount: rejectedRecords.length,
        },
        validRecords,
        rejectedRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/candidates/bulk-import/confirm
 * Commits verified candidate records to database in batches
 */
export const confirmBulkImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ success: false, message: 'No records provided for import' });
      return;
    }

    const batchSize = 100;
    let successfullyImported = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((record) => ({
        ...record,
        candidateId: generateCandidateId(record.passingYear),
      }));

      try {
        const result = await Candidate.insertMany(batch, { ordered: false });
        successfullyImported += result.length;
      } catch (err: any) {
        if (err.insertedDocs) {
          successfullyImported += err.insertedDocs.length;
        }
        errors.push(err.message || 'Error occurred in batch');
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully imported ${successfullyImported} candidates`,
      data: {
        totalRequested: records.length,
        successfullyImported,
        failedCount: records.length - successfullyImported,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/candidates/bulk-import/export-rejected
 * Downloads an Excel report of rejected import rows with reasons
 */
export const exportRejectedReport = (
  req: Request,
  res: Response
): void => {
  const { rejectedRecords } = req.body;

  if (!Array.isArray(rejectedRecords) || rejectedRecords.length === 0) {
    res.status(400).json({ success: false, message: 'No rejected records provided' });
    return;
  }

  const rows = rejectedRecords.map((r: any) => ({
    'Row Number': r.rowNumber,
    'Rejection Reason': r.reason,
    ...r.data,
  }));

  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Rejected_Rows');

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="import_rejection_report.xlsx"');
  res.send(buffer);
};
