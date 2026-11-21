import { Router } from 'express';
import {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  toggleAdminStatus,
  resetAdminPassword,
  revokeAdminSessions,
  getAdminActivity,
} from '../controllers/adminManagement.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware);

// Admin directory & details
router.get('/', requirePermission('admins.view'), getAdmins);
router.post('/', requirePermission('admins.create'), createAdmin);
router.get('/:id', requirePermission('admins.view'), getAdminById);
router.put('/:id', requirePermission('admins.update'), updateAdmin);
router.patch('/:id/status', requirePermission('admins.deactivate'), toggleAdminStatus);
router.post('/:id/reset-password', requirePermission('admins.update'), resetAdminPassword);
router.post('/:id/revoke-sessions', requirePermission('sessions.revoke'), revokeAdminSessions);
router.get('/:id/activity', requirePermission('audit_logs.view'), getAdminActivity);

export default router;
