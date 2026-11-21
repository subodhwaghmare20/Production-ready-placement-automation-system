import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { spreadsheetUpload } from '../config/multer';
import {
  previewSpreadsheetFile,
  parseSpreadsheetFile,
  searchCandidatesDatabase,
  validateNumbers,
  createFromUnknown,
  matchCompanyRequirements,
  assignCandidates,
  getFetchHistory,
  getOperationDetail,
  downloadOperationReport,
  getRecipientReadiness,
} from '../controllers/contactFetcher.controller';

const router = Router();

// Protect all contact-fetcher endpoints
router.use(authMiddleware);

// Source 1 & 2: Spreadsheet File Operations
router.post('/preview', spreadsheetUpload.single('file'), previewSpreadsheetFile);
router.post('/parse', spreadsheetUpload.single('file'), parseSpreadsheetFile);

// Source 3: MongoDB Database Fetcher
router.get('/candidates', searchCandidatesDatabase);

// Source 4: Manual Phone Number Paste & Extraction
router.post('/validate-numbers', validateNumbers);
router.post('/create-from-unknown', createFromUnknown);

// Intelligence & Matching
router.post('/match-company', matchCompanyRequirements);

// Assignment Engine
router.post('/assign', assignCandidates);

// History & Downloadable CSV Reports
router.get('/history', getFetchHistory);
router.get('/history/:id', getOperationDetail);
router.get('/reports/:id/download', downloadOperationReport);

// WhatsApp Integration Readiness Resolver
router.get('/recipient-readiness/:groupId', getRecipientReadiness);

export default router;

