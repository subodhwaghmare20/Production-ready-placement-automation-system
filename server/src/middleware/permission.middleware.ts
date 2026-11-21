import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { permissionService } from '../services/permission.service';
import { auditLogger } from '../services/auditLogger.service';

/**
 * Higher-order middleware factory that enforces granular RBAC permissions.
 * Grants access if administrator has ANY of the specified permissions,
 * or if administrator has the 'superadmin' role / '*' permission.
 */
export const requirePermission = (...neededPermissions: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const admin = req.admin;
      if (!admin) {
        res.status(401).json({
          success: false,
          message: 'Authentication required. No session found.',
        });
        return;
      }

      if (!admin.isActive) {
        res.status(403).json({
          success: false,
          message: 'Account is deactivated. Access denied.',
        });
        return;
      }

      // Super Admin bypass
      if (admin.role === 'superadmin' || admin.role === 'Super Admin') {
        return next();
      }

      // Check each needed permission
      let hasAccess = false;
      for (const perm of neededPermissions) {
        const allowed = await permissionService.hasPermission(admin, perm);
        if (allowed) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        // Log unauthorized attempt to audit log
        auditLogger.log(req, {
          action: 'ACCESS_DENIED',
          module: 'AUTH',
          outcome: 'FAILURE',
          details: {
            requiredPermissions: neededPermissions,
            adminRole: admin.role,
            endpoint: req.originalUrl,
            method: req.method,
          },
        }).catch(() => {});

        res.status(403).json({
          success: false,
          message: `Forbidden. You do not have the required permission(s): ${neededPermissions.join(', ')}.`,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
