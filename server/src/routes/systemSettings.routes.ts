import { Router } from 'express';
import {
  getSystemSettings,
  updateSystemSettings,
  getSystemStats,
} from '../controllers/systemSettings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('settings.view'), getSystemSettings);
router.put('/', requirePermission('settings.update'), updateSystemSettings);
router.get('/stats', requirePermission('settings.view'), getSystemStats);

export default router;
