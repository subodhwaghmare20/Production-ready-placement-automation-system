import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLogById,
  exportAuditLogsCsv,
} from '../controllers/auditLog.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('audit_logs.view'), getAuditLogs);
router.get('/export/csv', requirePermission('audit_logs.export', 'audit_logs.view'), exportAuditLogsCsv);
router.get('/:id', requirePermission('audit_logs.view'), getAuditLogById);

export default router;
