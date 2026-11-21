import { Request } from 'express';
import { AuditLog, IAuditLog, AuditModule, AuditOutcome } from '../models/AuditLog.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export interface AuditLogOptions {
  action: string;
  module: AuditModule;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  outcome?: AuditOutcome;
  details?: Record<string, any>;
}

export class AuditLoggerService {
  /**
   * Sanitizes sensitive properties from metadata before saving
   */
  private sanitizeDetails(details?: Record<string, any>): Record<string, any> {
    if (!details || typeof details !== 'object') return {};
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'appSecret',
      'key',
      'jwt',
    ];

    const copy = { ...details };
    for (const k of Object.keys(copy)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        copy[k] = '[REDACTED]';
      }
    }
    return copy;
  }

  /**
   * Logs a structured audit event into the append-only audit trail
   */
  async log(req: Request | AuthenticatedRequest, options: AuditLogOptions): Promise<IAuditLog> {
    const admin = (req as AuthenticatedRequest).admin;
    const actorId = admin?._id;
    const actorName = admin?.name || (req.body?.email ? `Unauthenticated (${req.body.email})` : 'System');
    const actorEmail = admin?.email || req.body?.email || 'system@placement.internal';

    // Parse IP Address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    // Parse User Agent
    const userAgent = (req.headers['user-agent'] as string) || 'Unknown';

    const auditId = `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const auditEntry = await AuditLog.create({
      auditId,
      actorId,
      actorName,
      actorEmail,
      action: options.action,
      module: options.module,
      targetType: options.targetType,
      targetId: options.targetId,
      targetName: options.targetName,
      ipAddress,
      userAgent,
      outcome: options.outcome || 'SUCCESS',
      details: this.sanitizeDetails(options.details),
      createdAt: new Date(),
    });

    return auditEntry;
  }

  /**
   * Queries paginated audit logs with multi-field filtering
   */
  async getLogs(params: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    actorId?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ logs: IAuditLog[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const query: any = {};

    if (params.module) query.module = params.module;
    if (params.action) query.action = params.action;
    if (params.actorId) query.actorId = params.actorId;
    if (params.outcome) query.outcome = params.outcome;

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) query.createdAt.$gte = new Date(params.startDate);
      if (params.endDate) query.createdAt.$lte = new Date(params.endDate);
    }

    if (params.search) {
      query.$or = [
        { action: { $regex: params.search, $options: 'i' } },
        { actorName: { $regex: params.search, $options: 'i' } },
        { actorEmail: { $regex: params.search, $options: 'i' } },
        { targetName: { $regex: params.search, $options: 'i' } },
        { auditId: { $regex: params.search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs: logs as unknown as IAuditLog[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generates CSV format for audit export
   */
  async exportToCsv(params: any): Promise<string> {
    const { logs } = await this.getLogs({ ...params, limit: 5000, page: 1 });

    const headers = [
      'Audit ID',
      'Timestamp',
      'Administrator',
      'Email',
      'Action',
      'Module',
      'Target Type',
      'Target Name',
      'Outcome',
      'IP Address',
    ];

    const rows = logs.map((l) => [
      l.auditId,
      new Date(l.createdAt).toISOString(),
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      `"${(l.actorEmail || '').replace(/"/g, '""')}"`,
      l.action,
      l.module,
      l.targetType || 'N/A',
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      l.outcome,
      l.ipAddress || 'Unknown',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const auditLogger = new AuditLoggerService();
