import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { campaignService } from '../services/campaign.service';
import { CampaignStatus } from '../models/Campaign.model';

export const getCampaignStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await campaignService.getDashboardStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const previewAudience = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const result = await campaignService.previewAudience(groupId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      companyId,
      groupId,
      templateId,
      metaTemplateId,
      metaTemplateName,
      provider,
      messageContent,
      metadata,
    } = req.body;

    if (!name || !companyId || !groupId || !messageContent) {
      res.status(400).json({
        success: false,
        message: 'Campaign name, target company, virtual group, and message content are required.',
      });
      return;
    }

    const adminId = req.admin?.id || (req.admin as any)?._id;
    if (!adminId) {
      res.status(401).json({ success: false, message: 'Admin authentication required.' });
      return;
    }

    const result = await campaignService.createCampaign({
      name,
      companyId,
      groupId,
      templateId,
      metaTemplateId,
      metaTemplateName,
      provider,
      messageContent,
      metadata,
      adminId,
    });

    res.status(201).json({
      success: true,
      message: `Campaign '${result.campaign.name}' prepared successfully with ${result.eligibleRecipients.length} eligible recipients.`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to prepare campaign',
    });
  }
};

export const getCampaigns = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, companyId, search, page, limit } = req.query;
    const result = await campaignService.getCampaigns({
      status: status as CampaignStatus | undefined,
      companyId: companyId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCampaignById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const getCampaignRecipients = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, personalizationStatus, isApproved, isExcluded, page, limit } = req.query;

    const result = await campaignService.getCampaignRecipients(id, {
      status: status as string | undefined,
      personalizationStatus: personalizationStatus as string | undefined,
      isApproved: isApproved !== undefined ? isApproved === 'true' : undefined,
      isExcluded: isExcluded !== undefined ? isExcluded === 'true' : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to fetch campaign recipients',
    });
  }
};

export const getNextRecipient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await campaignService.getNextAssistedRecipient(id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to fetch next recipient',
    });
  }
};

export const markChatOpened = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const adminId = req.admin?.id;
    const adminName = (req.admin as any)?.name || 'Administrator';
    const recipient = await campaignService.markChatOpened(id, recipientId, adminId, adminName);

    res.status(200).json({
      success: true,
      message: 'Chat opened recorded.',
      data: recipient,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to record chat opened status',
    });
  }
};

export const confirmManualSend = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const { notes } = req.body;
    const adminId = req.admin?.id;
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await campaignService.confirmManualSend(id, recipientId, notes, adminId, adminName);

    res.status(200).json({
      success: true,
      message: result.isCompleted
        ? 'Manual send confirmed. All recipients in campaign completed!'
        : 'Manual send confirmed. Ready for next candidate.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to confirm manual send',
    });
  }
};

export const skipRecipient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const { skipReason } = req.body;
    const adminId = req.admin?.id;
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await campaignService.skipRecipient(id, recipientId, skipReason, adminId, adminName);

    res.status(200).json({
      success: true,
      message: 'Recipient skipped.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to skip recipient',
    });
  }
};

export const markChatFailed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const { errorDetails } = req.body;
    const adminId = req.admin?.id;
    const adminName = (req.admin as any)?.name || 'Administrator';

    const result = await campaignService.markChatFailed(id, recipientId, errorDetails, adminId, adminName);

    res.status(200).json({
      success: true,
      message: 'Recorded chat opening failure.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to record chat failure',
    });
  }
};

export const retryRecipient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const adminId = req.admin?.id;
    const adminName = (req.admin as any)?.name || 'Administrator';

    const recipient = await campaignService.retryRecipient(id, recipientId, adminId, adminName);

    res.status(200).json({
      success: true,
      message: 'Recipient reset to READY queue.',
      data: recipient,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to retry recipient',
    });
  }
};

export const updateCampaignStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.admin?.id;
    const adminName = (req.admin as any)?.name || 'Administrator';

    if (!['PAUSED', 'IN_PROGRESS', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Status must be one of PAUSED, IN_PROGRESS, or CANCELLED',
      });
      return;
    }

    const campaign = await campaignService.updateCampaignStatus(id, status, adminId, adminName);

    res.status(200).json({
      success: true,
      message: `Campaign status updated to ${status}`,
      data: campaign,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update campaign status',
    });
  }
};

export const getValidationSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const summary = await campaignService.getValidationSummary(id);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message || 'Failed to get validation summary' });
  }
};

export const getRecipientPreview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const preview = await campaignService.getRecipientPreview(id, recipientId);
    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message || 'Recipient not found' });
  }
};

export const updateRecipientMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const { message } = req.body;
    const adminId = req.admin?.id || (req.admin as any)?._id;

    const recipient = await campaignService.updateRecipientMessage(id, recipientId, message, adminId);
    res.status(200).json({
      success: true,
      message: 'Candidate message updated successfully. Original template remains unchanged.',
      data: recipient,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update candidate message' });
  }
};

export const resetRecipientMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const recipient = await campaignService.resetRecipientMessage(id, recipientId);
    res.status(200).json({
      success: true,
      message: 'Message reset back to template personalization.',
      data: recipient,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to reset message' });
  }
};

export const approveRecipient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const adminId = req.admin?.id || (req.admin as any)?._id;

    const recipient = await campaignService.approveRecipient(id, recipientId, adminId);
    res.status(200).json({
      success: true,
      message: 'Candidate message approved for dispatch.',
      data: recipient,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to approve message' });
  }
};

export const excludeRecipient = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    const { reason } = req.body;

    const recipient = await campaignService.excludeRecipient(id, recipientId, reason);
    res.status(200).json({
      success: true,
      message: 'Candidate excluded from campaign dispatch.',
      data: recipient,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to exclude candidate' });
  }
};

export const approveAllValid = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.admin?.id || (req.admin as any)?._id;

    const result = await campaignService.approveAllValid(id, adminId);
    res.status(200).json({
      success: true,
      message: `Approved ${result.approvedCount} valid candidate messages.`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to bulk approve messages' });
  }
};

export const excludeAllIncomplete = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await campaignService.excludeAllIncomplete(id, reason);
    res.status(200).json({
      success: true,
      message: `Excluded ${result.excludedCount} candidates with incomplete information.`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to bulk exclude incomplete candidates' });
  }
};
