import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Admin, IAdmin } from '../models/Admin.model';
import { Role } from '../models/Role.model';
import { AuditLog } from '../models/AuditLog.model';
import { auditLogger } from '../services/auditLogger.service';
import { sessionService } from '../services/session.service';

/**
 * Validates password complexity: min 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
 */
export const validatePasswordComplexity = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*).' };
  }
  return { valid: true };
};

/**
 * GET /api/admins
 * List administrators with pagination, search, and status/role filters
 */
export const getAdmins = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const search = (req.query.search as string)?.trim();
    const role = req.query.role as string;
    const status = req.query.status as string;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { adminId: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) query.role = role;
    if (status) query.isActive = status === 'active';

    const [admins, total] = await Promise.all([
      Admin.find(query)
        .populate('roleId', 'name slug permissions isSystemRole')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Admin.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        admins,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admins/:id
 * Get single administrator details
 */
export const getAdminById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const admin = await Admin.findById(req.params.id)
      .populate('roleId', 'name slug permissions')
      .lean();

    if (!admin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admins
 * Create a new administrator (never public registration)
 */
export const createAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, phone, password, role, roleId, customPermissions } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
      return;
    }

    // Password complexity check
    const pwdCheck = validatePasswordComplexity(password);
    if (!pwdCheck.valid) {
      res.status(400).json({ success: false, message: pwdCheck.error });
      return;
    }

    // Email uniqueness check
    const cleanEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: cleanEmail });
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'An administrator with this email already exists.',
      });
      return;
    }

    // Privilege escalation prevention
    const currentAdmin = req.admin!;
    const isSuperAdmin = currentAdmin.role === 'superadmin' || currentAdmin.role === 'Super Admin';
    const targetRole = role?.toLowerCase() || 'admin';

    if ((targetRole === 'superadmin' || targetRole === 'super admin') && !isSuperAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only existing Super Administrators can provision another Super Admin account.',
      });
      return;
    }

    const newAdmin = new Admin({
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim(),
      password,
      role: targetRole,
      roleId: roleId || undefined,
      customPermissions: Array.isArray(customPermissions) ? customPermissions : [],
      isActive: true,
    });

    await newAdmin.save();

    await auditLogger.log(req, {
      action: 'ADMIN_CREATED',
      module: 'ADMINS',
      targetType: 'Admin',
      targetId: String(newAdmin._id),
      targetName: newAdmin.name,
      outcome: 'SUCCESS',
      details: { email: newAdmin.email, role: newAdmin.role },
    });

    res.status(201).json({
      success: true,
      message: `Administrator '${newAdmin.name}' created successfully.`,
      data: newAdmin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admins/:id
 * Edit administrator details
 */
export const updateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, phone, role, roleId, customPermissions } = req.body;
    const targetAdmin = await Admin.findById(req.params.id);

    if (!targetAdmin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    const currentAdmin = req.admin!;
    const isSuperAdmin = currentAdmin.role === 'superadmin' || currentAdmin.role === 'Super Admin';

    // Prevent non-superadmin from modifying a Super Admin
    const targetIsSuperAdmin = targetAdmin.role === 'superadmin' || targetAdmin.role === 'Super Admin';
    if (targetIsSuperAdmin && !isSuperAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only Super Administrators can modify Super Admin accounts.',
      });
      return;
    }

    // Privilege escalation prevention
    if (role && (role.toLowerCase() === 'superadmin' || role.toLowerCase() === 'super admin') && !isSuperAdmin) {
      res.status(403).json({
        success: false,
        message: 'You cannot escalate roles to Super Administrator.',
      });
      return;
    }

    // Protect last active Super Admin against demotion
    if (targetIsSuperAdmin && role && role !== 'superadmin' && role !== 'Super Admin') {
      const activeSuperAdmins = await Admin.countDocuments({
        role: { $in: ['superadmin', 'Super Admin'] },
        isActive: true,
      });
      if (activeSuperAdmins <= 1) {
        res.status(400).json({
          success: false,
          message: 'Cannot demote the last active Super Administrator.',
        });
        return;
      }
    }

    if (name) targetAdmin.name = name.trim();
    if (phone !== undefined) targetAdmin.phone = phone?.trim();
    if (role && isSuperAdmin) targetAdmin.role = role;
    if (roleId !== undefined && isSuperAdmin) targetAdmin.roleId = roleId;
    if (customPermissions && isSuperAdmin) targetAdmin.customPermissions = customPermissions;

    if (email && email.toLowerCase().trim() !== targetAdmin.email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await Admin.findOne({ email: cleanEmail, _id: { $ne: targetAdmin._id } });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email is already in use by another account.' });
        return;
      }
      targetAdmin.email = cleanEmail;
    }

    await targetAdmin.save();

    await auditLogger.log(req, {
      action: 'ADMIN_UPDATED',
      module: 'ADMINS',
      targetType: 'Admin',
      targetId: String(targetAdmin._id),
      targetName: targetAdmin.name,
      outcome: 'SUCCESS',
      details: { role: targetAdmin.role },
    });

    res.status(200).json({
      success: true,
      message: 'Administrator details updated successfully.',
      data: targetAdmin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admins/:id/status
 * Activate or deactivate administrator with last-Super-Admin safeguard
 */
export const toggleAdminStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { isActive } = req.body;
    const targetAdmin = await Admin.findById(req.params.id);

    if (!targetAdmin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    // Cannot deactivate oneself
    if (String(targetAdmin._id) === String(req.admin!._id) && !isActive) {
      res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own administrator account.',
      });
      return;
    }

    // Safeguard: Prevent deactivation of the last active Super Admin
    const isTargetSuper = targetAdmin.role === 'superadmin' || targetAdmin.role === 'Super Admin';
    if (isTargetSuper && !isActive) {
      const activeSuperCount = await Admin.countDocuments({
        role: { $in: ['superadmin', 'Super Admin'] },
        isActive: true,
      });

      if (activeSuperCount <= 1) {
        res.status(400).json({
          success: false,
          message: 'Security safeguard: Cannot deactivate the last active Super Administrator.',
        });
        return;
      }
    }

    targetAdmin.isActive = Boolean(isActive);
    await targetAdmin.save();

    // If deactivated, revoke all their active sessions immediately
    if (!targetAdmin.isActive) {
      await sessionService.revokeAllSessionsForAdmin(String(targetAdmin._id), req.admin!._id);
    }

    await auditLogger.log(req, {
      action: targetAdmin.isActive ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      module: 'ADMINS',
      targetType: 'Admin',
      targetId: String(targetAdmin._id),
      targetName: targetAdmin.name,
      outcome: 'SUCCESS',
      details: { newStatus: targetAdmin.isActive ? 'Active' : 'Inactive' },
    });

    res.status(200).json({
      success: true,
      message: `Administrator ${targetAdmin.name} has been ${targetAdmin.isActive ? 'activated' : 'deactivated'}.`,
      data: { id: targetAdmin._id, isActive: targetAdmin.isActive },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admins/:id/reset-password
 * Resets an administrator's password, invalidating all their sessions
 */
export const resetAdminPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newPassword } = req.body;
    const targetAdmin = await Admin.findById(req.params.id);

    if (!targetAdmin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    const currentAdmin = req.admin!;
    const isSuperAdmin = currentAdmin.role === 'superadmin' || currentAdmin.role === 'Super Admin';
    const isSelf = String(currentAdmin._id) === String(targetAdmin._id);

    const isTargetSuper = targetAdmin.role === 'superadmin' || targetAdmin.role === 'Super Admin';
    if (isTargetSuper && !isSuperAdmin && !isSelf) {
      res.status(403).json({
        success: false,
        message: 'Only Super Administrators can reset passwords for Super Admin accounts.',
      });
      return;
    }

    // Password complexity validation
    const pwdCheck = validatePasswordComplexity(newPassword);
    if (!pwdCheck.valid) {
      res.status(400).json({ success: false, message: pwdCheck.error });
      return;
    }

    targetAdmin.password = newPassword;
    targetAdmin.failedLoginAttempts = 0;
    targetAdmin.lockUntil = undefined;
    targetAdmin.tokenVersion = (targetAdmin.tokenVersion || 0) + 1; // Invalidate all prior sessions
    await targetAdmin.save();

    // Revoke all existing sessions in DB
    await sessionService.revokeAllSessionsForAdmin(String(targetAdmin._id), currentAdmin._id);

    await auditLogger.log(req, {
      action: 'PASSWORD_RESET',
      module: 'ADMINS',
      targetType: 'Admin',
      targetId: String(targetAdmin._id),
      targetName: targetAdmin.name,
      outcome: 'SUCCESS',
      details: { resetBy: currentAdmin.name, isSelf },
    });

    res.status(200).json({
      success: true,
      message: `Password for ${targetAdmin.name} has been reset successfully. Active sessions revoked.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admins/:id/revoke-sessions
 * Revokes all sessions for target admin
 */
export const revokeAdminSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const targetAdmin = await Admin.findById(req.params.id);
    if (!targetAdmin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    const count = await sessionService.revokeAllSessionsForAdmin(String(targetAdmin._id), req.admin!._id);

    await auditLogger.log(req, {
      action: 'SESSIONS_REVOKED',
      module: 'SESSIONS',
      targetType: 'Admin',
      targetId: String(targetAdmin._id),
      targetName: targetAdmin.name,
      outcome: 'SUCCESS',
      details: { revokedCount: count },
    });

    res.status(200).json({
      success: true,
      message: `Revoked ${count} active session(s) for ${targetAdmin.name}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admins/:id/activity
 * Fetches recent audit events for this administrator
 */
export const getAdminActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const activities = await AuditLog.find({
      $or: [{ actorId: req.params.id }, { targetId: req.params.id }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};
