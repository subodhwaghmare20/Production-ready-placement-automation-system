import { Request } from 'express';
import { AdminSession, IAdminSession } from '../models/AdminSession.model';
import { Admin, IAdmin } from '../models/Admin.model';

export class SessionService {
  /**
   * Helper to parse browser and OS from User-Agent string
   */
  private parseUserAgent(uaString: string): { browser: string; os: string; device: string } {
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let device = 'Desktop';

    if (!uaString) return { browser, os, device };

    // OS detection (check mobile devices first)
    if (/android/i.test(uaString)) { os = 'Android'; device = 'Mobile'; }
    else if (/iphone|ipad|ipod/i.test(uaString)) { os = 'iOS'; device = 'Mobile'; }
    else if (/windows/i.test(uaString)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(uaString)) os = 'macOS';
    else if (/linux/i.test(uaString)) os = 'Linux';

    // Browser detection
    if (/edg/i.test(uaString)) browser = 'Microsoft Edge';
    else if (/chrome|crios/i.test(uaString)) browser = 'Google Chrome';
    else if (/firefox|fxios/i.test(uaString)) browser = 'Mozilla Firefox';
    else if (/safari/i.test(uaString)) browser = 'Apple Safari';
    else if (/postman/i.test(uaString)) browser = 'Postman API Client';

    return { browser, os, device };
  }

  /**
   * Creates a new session record upon login
   */
  async createSession(admin: IAdmin, req: Request): Promise<IAdminSession> {
    const sessionId = `SESS_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const userAgent = (req.headers['user-agent'] as string) || '';
    const { browser, os, device } = this.parseUserAgent(userAgent);

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await AdminSession.create({
      sessionId,
      adminId: admin._id,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
      lastActive: new Date(),
      expiresAt,
      isRevoked: false,
    });

    return session;
  }

  /**
   * Validates if a session is currently active and not revoked
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    if (!sessionId) return true; // Fallback for legacy tokens without sessionId
    const session = await AdminSession.findOne({ sessionId });
    if (!session) return false;
    if (session.isRevoked || session.expiresAt < new Date()) return false;

    // Refresh lastActive time throttled (only update if > 5 minutes since last update)
    if (Date.now() - session.lastActive.getTime() > 5 * 60 * 1000) {
      session.lastActive = new Date();
      await session.save();
    }

    return true;
  }

  /**
   * Lists all active and recent sessions for an administrator
   */
  async getAdminSessions(
    adminId: string,
    currentSessionId?: string
  ): Promise<Array<IAdminSession & { isCurrent: boolean }>> {
    const sessions = await AdminSession.find({
      adminId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActive: -1 })
      .lean();

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.sessionId === currentSessionId,
    })) as unknown as Array<IAdminSession & { isCurrent: boolean }>;
  }

  /**
   * Revokes a specific session by ID
   */
  async revokeSession(sessionId: string, revokedByAdminId?: any): Promise<boolean> {
    const session = await AdminSession.findOne({ sessionId });
    if (!session) return false;

    session.isRevoked = true;
    session.revokedAt = new Date();
    if (revokedByAdminId) session.revokedBy = revokedByAdminId;
    await session.save();
    return true;
  }

  /**
   * Revokes all other sessions for an administrator except the current one
   */
  async revokeAllOtherSessions(adminId: string, currentSessionId: string): Promise<number> {
    const result = await AdminSession.updateMany(
      {
        adminId,
        sessionId: { $ne: currentSessionId },
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revocationReason: 'Revoked by administrator (Revoke other sessions)',
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Revokes all active sessions for an administrator (and increments tokenVersion)
   */
  async revokeAllSessionsForAdmin(targetAdminId: string, revokedByAdminId?: any): Promise<number> {
    const admin = await Admin.findById(targetAdminId);
    if (admin) {
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      await admin.save();
    }

    const result = await AdminSession.updateMany(
      {
        adminId: targetAdminId,
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: revokedByAdminId,
          revocationReason: 'Revoked by administrator / password reset',
        },
      }
    );

    return result.modifiedCount;
  }
}

export const sessionService = new SessionService();
