import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '../models/Role.model';
import { Admin } from '../models/Admin.model';
import { permissionService, ALL_PERMISSIONS } from '../services/permission.service';
import { auditLogger } from '../services/auditLogger.service';

/**
 * GET /api/roles
 * Lists all roles, automatically ensuring system roles exist
 */
export const getRoles = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await permissionService.seedDefaultRoles();
    const roles = await Role.find().sort({ isSystemRole: -1, createdAt: 1 }).lean();
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roles/permissions
 * Returns all permission definitions grouped by category
 */
export const getPermissionCatalog = (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const grouped = ALL_PERMISSIONS.reduce((acc: Record<string, any[]>, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        all: ALL_PERMISSIONS,
        grouped,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/roles
 * Creates a custom role
 */
export const createRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Role name is required.' });
      return;
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
    const existing = await Role.findOne({ slug });

    if (existing) {
      res.status(400).json({ success: false, message: 'A role with this name/slug already exists.' });
      return;
    }

    const roleId = `ROLE_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newRole = await Role.create({
      roleId,
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      isSystemRole: false,
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    await auditLogger.log(req, {
      action: 'ROLE_CREATED',
      module: 'ROLES',
      targetType: 'Role',
      targetId: String(newRole._id),
      targetName: newRole.name,
      outcome: 'SUCCESS',
      details: { slug: newRole.slug, permissionsCount: newRole.permissions.length },
    });

    res.status(201).json({
      success: true,
      message: `Role '${newRole.name}' created successfully.`,
      data: newRole,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/roles/:id
 * Updates role permissions and details
 */
export const updateRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      res.status(404).json({ success: false, message: 'Role not found.' });
      return;
    }

    // Super Admin system role permissions are immutable
    if (role.slug === 'superadmin' && permissions && !permissions.includes('*')) {
      res.status(400).json({
        success: false,
        message: 'Super Admin permissions must remain unrestricted (*).',
      });
      return;
    }

    if (name && !role.isSystemRole) role.name = name.trim();
    if (description !== undefined) role.description = description.trim();
    if (Array.isArray(permissions)) role.permissions = permissions;

    await role.save();

    await auditLogger.log(req, {
      action: 'ROLE_UPDATED',
      module: 'ROLES',
      targetType: 'Role',
      targetId: String(role._id),
      targetName: role.name,
      outcome: 'SUCCESS',
      details: { permissions: role.permissions },
    });

    res.status(200).json({
      success: true,
      message: `Role '${role.name}' updated successfully.`,
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/roles/:id
 * Deletes custom role (system roles protected)
 */
export const deleteRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      res.status(404).json({ success: false, message: 'Role not found.' });
      return;
    }

    if (role.isSystemRole) {
      res.status(400).json({
        success: false,
        message: 'System default roles cannot be deleted.',
      });
      return;
    }

    // Check if role is assigned to any admin
    const assignedCount = await Admin.countDocuments({
      $or: [{ roleId: role._id }, { role: role.slug }],
    });

    if (assignedCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete role '${role.name}'. It is currently assigned to ${assignedCount} administrator(s).`,
      });
      return;
    }

    await Role.findByIdAndDelete(role._id);

    await auditLogger.log(req, {
      action: 'ROLE_DELETED',
      module: 'ROLES',
      targetType: 'Role',
      targetId: String(role._id),
      targetName: role.name,
      outcome: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: `Role '${role.name}' deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
