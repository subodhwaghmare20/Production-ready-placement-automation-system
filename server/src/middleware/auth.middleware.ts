import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token';
import { Admin, IAdmin } from '../models/Admin.model';
import { sessionService } from '../services/session.service';

export interface AuthenticatedRequest extends Request {
  admin?: IAdmin;
  sessionId?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No session token provided.',
      });
      return;
    }

    let decoded: TokenPayload;
    try {
      decoded = verifyToken(token);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
      return;
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Admin account associated with this session no longer exists.',
      });
      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact the administrator.',
      });
      return;
    }

    // Check tokenVersion for global session revocation (e.g. password reset)
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion < (admin.tokenVersion || 0)) {
      res.status(401).json({
        success: false,
        message: 'Session has been invalidated due to a security update or password change. Please log in again.',
      });
      return;
    }

    // Check individual session revocation
    if (decoded.sessionId) {
      const isValid = await sessionService.isSessionValid(decoded.sessionId);
      if (!isValid) {
        res.status(401).json({
          success: false,
          message: 'Your active session was revoked. Please log in again.',
        });
        return;
      }
      req.sessionId = decoded.sessionId;
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};
