import { Router } from 'express';
import {
  createCandidate,
  getCandidates,
  getCandidateStats,
  exportCandidates,
  getSampleTemplate,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  uploadResume,
  getResume,
  previewBulkImport,
  confirmBulkImport,
  exportRejectedReport,
} from '../controllers/candidate.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { resumeUpload, spreadsheetUpload } from '../config/multer';

const router = Router();

// All candidate management routes are protected
router.use(authMiddleware);

// Stats & Export routes (place before :id to prevent matching 'stats' as :id)
router.get('/stats', getCandidateStats);
router.get('/export', exportCandidates);
router.get('/sample-template', getSampleTemplate);

// Resume Upload
router.post('/upload-resume', resumeUpload.single('resume'), uploadResume);

// Bulk Import
router.post('/bulk-import/preview', spreadsheetUpload.single('file'), previewBulkImport);
router.post('/bulk-import/confirm', confirmBulkImport);
router.post('/bulk-import/export-rejected', exportRejectedReport);

// Core CRUD
router.post('/', createCandidate);
router.get('/', getCandidates);
router.get('/:id', getCandidateById);
router.put('/:id', updateCandidate);
router.delete('/:id', deleteCandidate);
router.get('/:id/resume', getResume);

export default router;

