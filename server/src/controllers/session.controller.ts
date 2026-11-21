import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sessionService } from '../services/session.service';
import { auditLogger } from '../services/auditLogger.service';

/**
 * GET /api/sessions/my-sessions
 * Returns all active sessions for the current authenticated administrator
 */
export const getMySessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = String(req.admin!._id);
    const sessions = await sessionService.getAdminSessions(adminId, req.sessionId);
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions/revoke/:sessionId
 * Revokes a specific session
 */
export const revokeMySession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const success = await sessionService.revokeSession(sessionId, req.admin!._id);

    if (!success) {
      res.status(404).json({ success: false, message: 'Session not found or already revoked.' });
      return;
    }

    await auditLogger.log(req, {
      action: 'SESSION_REVOKED',
      module: 'SESSIONS',
      targetType: 'AdminSession',
      targetId: sessionId,
      outcome: 'SUCCESS',
      details: { sessionId },
    });

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions/revoke-all-others
 * Terminates all other sessions except current
 */
export const revokeAllOtherSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.sessionId) {
      res.status(400).json({
        success: false,
        message: 'Current session ID could not be identified.',
      });
      return;
    }

    const modifiedCount = await sessionService.revokeAllOtherSessions(
      String(req.admin!._id),
      req.sessionId
    );

    await auditLogger.log(req, {
      action: 'ALL_OTHER_SESSIONS_REVOKED',
      module: 'SESSIONS',
      targetType: 'AdminSession',
      outcome: 'SUCCESS',
      details: { revokedCount: modifiedCount },
    });

    res.status(200).json({
      success: true,
      message: `Successfully revoked ${modifiedCount} other active session(s).`,
      data: { revokedCount: modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};
