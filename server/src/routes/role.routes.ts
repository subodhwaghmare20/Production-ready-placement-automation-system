import { Router } from 'express';
import {
  getRoles,
  getPermissionCatalog,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('roles.manage', 'admins.view'), getRoles);
router.get('/permissions', requirePermission('roles.manage', 'admins.view'), getPermissionCatalog);
router.post('/', requirePermission('roles.manage'), createRole);
router.put('/:id', requirePermission('roles.manage'), updateRole);
router.delete('/:id', requirePermission('roles.manage'), deleteRole);

export default router;
