import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin.model';
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  generateCsrfToken,
  setCsrfCookie,
} from '../utils/token';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sessionService } from '../services/session.service';
import { auditLogger } from '../services/auditLogger.service';
import { permissionService } from '../services/permission.service';

/**
 * POST /api/auth/login
 * Validates email & password, handles brute-force protection, issues JWT & CSRF cookies,
 * records session and logs audit event.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const admin = await Admin.findOne({ email: cleanEmail }).select('+password');

    if (!admin) {
      await auditLogger.log(req, {
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        outcome: 'FAILURE',
        details: { reason: 'Account not found', email: cleanEmail },
      });
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Check account lockout
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (admin.lockUntil.getTime() - Date.now()) / (60 * 1000)
      );
      await auditLogger.log(req, {
        action: 'LOGIN_LOCKED',
        module: 'AUTH',
        targetType: 'Admin',
        targetId: String(admin._id),
        targetName: admin.name,
        outcome: 'FAILURE',
        details: { remainingMinutes, email: cleanEmail },
      });
      res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
      });
      return;
    }

    if (!admin.isActive) {
      await auditLogger.log(req, {
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        targetType: 'Admin',
        targetId: String(admin._id),
        targetName: admin.name,
        outcome: 'FAILURE',
        details: { reason: 'Account inactive' },
      });
      res.status(403).json({
        success: false,
        message: 'Your admin account is inactive. Please contact the administrator.',
      });
      return;
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts and trigger lockout if >= 5
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      let isLocked = false;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        isLocked = true;
      }
      await admin.save();

      await auditLogger.log(req, {
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        targetType: 'Admin',
        targetId: String(admin._id),
        targetName: admin.name,
        outcome: 'FAILURE',
        details: {
          failedAttempts: admin.failedLoginAttempts,
          accountLocked: isLocked,
        },
      });

      if (isLocked) {
        res.status(423).json({
          success: false,
          message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.',
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: `Invalid email or password. Attempt ${admin.failedLoginAttempts} of 5 before temporary lockout.`,
      });
      return;
    }

    // Reset failed attempts & update lastLogin
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    // Create active session in database
    const session = await sessionService.createSession(admin, req);

    // Generate JWT including sessionId and tokenVersion
    const token = generateToken({
      adminId: String(admin._id),
      email: admin.email,
      role: admin.role,
      sessionId: session.sessionId,
      tokenVersion: admin.tokenVersion || 0,
    });

    // Set secure HTTP-only cookie
    setAuthCookie(res, token);

    // Set CSRF token cookie for double-submit CSRF protection
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    // Resolve effective permissions
    const permissions = await permissionService.getEffectivePermissions(admin);

    // Log successful login audit event
    await auditLogger.log(req, {
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      targetType: 'Admin',
      targetId: String(admin._id),
      targetName: admin.name,
      outcome: 'SUCCESS',
      details: { sessionId: session.sessionId, browser: session.browser, os: session.os },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          adminId: admin.adminId,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          permissions,
          isActive: admin.isActive,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
        sessionId: session.sessionId,
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clears cookies and revokes the active session in database.
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.sessionId) {
      await sessionService.revokeSession(req.sessionId, req.admin?._id);
    }

    if (req.admin) {
      await auditLogger.log(req, {
        action: 'LOGOUT',
        module: 'AUTH',
        targetType: 'Admin',
        targetId: String(req.admin._id),
        targetName: req.admin.name,
        outcome: 'SUCCESS',
      });
    }

    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns authenticated admin profile and effective permissions from verified session.
 */
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const permissions = await permissionService.getEffectivePermissions(req.admin);

    res.status(200).json({
      success: true,
      message: 'Admin session verified',
      data: {
        admin: {
          id: req.admin._id,
          adminId: req.admin.adminId,
          name: req.admin.name,
          email: req.admin.email,
          phone: req.admin.phone,
          role: req.admin.role,
          permissions,
          isActive: req.admin.isActive,
          lastLogin: req.admin.lastLogin,
          createdAt: req.admin.createdAt,
          updatedAt: req.admin.updatedAt,
        },
        sessionId: req.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};
