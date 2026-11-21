import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { auditLogger } from '../services/auditLogger.service';
import { AuditLog } from '../models/AuditLog.model';

/**
 * GET /api/audit-logs
 * Paginated query with search and filters
 */
export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const module = req.query.module as string;
    const action = req.query.action as string;
    const actorId = req.query.actorId as string;
    const outcome = req.query.outcome as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const search = req.query.search as string;

    const result = await auditLogger.getLogs({
      page,
      limit,
      module,
      action,
      actorId,
      outcome,
      startDate,
      endDate,
      search,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit-logs/:id
 * Retrieve single audit log event details
 */
export const getAuditLogById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) {
      res.status(404).json({ success: false, message: 'Audit log record not found.' });
      return;
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit-logs/export/csv
 * Exports filtered audit trail to CSV file
 */
export const exportAuditLogsCsv = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const csvContent = await auditLogger.exportToCsv(req.query);
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
