import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { SystemSettings, ISystemSettings } from '../models/SystemSettings.model';
import { Candidate } from '../models/Candidate.model';
import { Company } from '../models/Company.model';
import { VirtualGroup } from '../models/VirtualGroup.model';
import { Campaign } from '../models/Campaign.model';
import { Admin } from '../models/Admin.model';
import { AuditLog } from '../models/AuditLog.model';
import { auditLogger } from '../services/auditLogger.service';

/**
 * Returns singleton system settings, seeding defaults if needed
 */
export const getSystemSettings = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates application configuration across categories
 */
export const updateSystemSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    const { general, candidate, campaign, security, notifications } = req.body;

    if (general) {
      settings.general = { ...settings.general, ...general };
    }
    if (candidate) {
      settings.candidate = { ...settings.candidate, ...candidate };
    }
    if (campaign) {
      settings.campaign = { ...settings.campaign, ...campaign };
    }
    if (security) {
      settings.security = { ...settings.security, ...security };
    }
    if (notifications) {
      settings.notifications = { ...settings.notifications, ...notifications };
    }

    settings.updatedBy = req.admin?._id;
    await settings.save();

    await auditLogger.log(req, {
      action: 'SETTINGS_UPDATED',
      module: 'SETTINGS',
      targetType: 'SystemSettings',
      outcome: 'SUCCESS',
      details: {
        updatedCategories: Object.keys(req.body).filter((k) =>
          ['general', 'candidate', 'campaign', 'security', 'notifications'].includes(k)
        ),
      },
    });

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/settings/system/stats
 * Health information, database record counts and storage overview
 */
export const getSystemStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      candidatesCount,
      companiesCount,
      groupsCount,
      campaignsCount,
      adminsCount,
      auditLogsCount,
    ] = await Promise.all([
      Candidate.countDocuments(),
      Company.countDocuments(),
      VirtualGroup.countDocuments(),
      Campaign.countDocuments(),
      Admin.countDocuments(),
      AuditLog.countDocuments(),
    ]);

    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      success: true,
      data: {
        recordCounts: {
          candidates: candidatesCount,
          companies: companiesCount,
          groups: groupsCount,
          campaigns: campaignsCount,
          admins: adminsCount,
          auditLogs: auditLogsCount,
        },
        health: {
          status: 'HEALTHY',
          nodeVersion: process.version,
          uptimeSeconds: Math.floor(uptimeSeconds),
          memoryUsageMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          totalHeapMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          environment: process.env.NODE_ENV || 'development',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
