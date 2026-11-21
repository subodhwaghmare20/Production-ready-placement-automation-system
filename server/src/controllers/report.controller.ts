import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { reportService, ReportFormat } from '../services/report.service';

function parseFormat(fmt?: unknown): ReportFormat {
  if (fmt === 'csv' || fmt === 'pdf') return fmt;
  return 'xlsx';
}

export const getCampaignSummaryReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { format, status, companyId, startDate, endDate } = req.query;
    const reportFormat = parseFormat(format);
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await reportService.generateCampaignSummaryReport(reportFormat, {
      status: status as string,
      companyId: companyId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      generatedBy: adminName,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.status(200).send(result.buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate campaign summary report' });
  }
};

export const getRecipientDetailsReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { format, campaignId, status, unmaskPhone } = req.query;
    const reportFormat = parseFormat(format);
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await reportService.generateRecipientDetailsReport(reportFormat, {
      campaignId: campaignId as string,
      status: status as string,
      unmaskPhone: unmaskPhone === 'true',
      generatedBy: adminName,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.status(200).send(result.buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate recipient details report' });
  }
};

export const getCompanyPerformanceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { format } = req.query;
    const reportFormat = parseFormat(format);
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await reportService.generateCompanyPerformanceReport(reportFormat, {
      generatedBy: adminName,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.status(200).send(result.buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate company performance report' });
  }
};

export const getMonthlyActivityReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { format } = req.query;
    const reportFormat = parseFormat(format);
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await reportService.generateMonthlyActivityReport(reportFormat, {
      generatedBy: adminName,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.status(200).send(result.buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate monthly activity report' });
  }
};

export const getFailedSkippedReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { format, unmaskPhone } = req.query;
    const reportFormat = parseFormat(format);
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await reportService.generateFailedSkippedReport(reportFormat, {
      unmaskPhone: unmaskPhone === 'true',
      generatedBy: adminName,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.status(200).send(result.buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate failed/skipped report' });
  }
};
