import { Router } from 'express';
import {
  createCompany,
  getCompanies,
  getCompanyStats,
  getCompanyById,
  getCompanyRequirements,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all company endpoints
router.use(authMiddleware);

// Stats route (must be before :id to prevent matching 'stats' as :id)
router.get('/stats', getCompanyStats);

// Requirements endpoint
router.get('/:id/requirements', getCompanyRequirements);

// Core CRUD
router.post('/', createCompany);
router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);

export default router;

