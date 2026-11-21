import { Router } from 'express';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  validateTemplate,
  previewTemplate,
  getPlaceholders,
  exportTemplates,
  importTemplates,
} from '../controllers/template.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Static/Action routes (before :id)
router.get('/placeholders', getPlaceholders);
router.post('/validate', validateTemplate);
router.post('/preview', previewTemplate);
router.get('/export', exportTemplates);
router.post('/import', importTemplates);

// Core collection routes
router.get('/', getTemplates);
router.post('/', createTemplate);

// Item routes
router.get('/:id', getTemplateById);
router.put('/:id', updateTemplate);
router.post('/:id/duplicate', duplicateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
