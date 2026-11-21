import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { whatsAppCloudConfigService } from '../services/cloudApi/whatsappCloudConfig.service';
import { metaGraphApiService } from '../services/cloudApi/metaGraphApi.service';
import { webhookProcessorService } from '../services/cloudApi/webhookProcessor.service';
import { cloudCampaignSenderService } from '../services/cloudApi/cloudCampaignSender.service';
import { MetaTemplate } from '../models/MetaTemplate.model';
import { WhatsAppWebhookEvent } from '../models/WhatsAppWebhookEvent.model';
import { WhatsAppInboundMessage } from '../models/WhatsAppInboundMessage.model';
import { WhatsAppSuppression } from '../models/WhatsAppSuppression.model';
import { Candidate } from '../models/Candidate.model';
import { normalizePhoneNumber } from '../utils/phoneNormalizer';

// --- CONNECTION SETTINGS ---

export const getConnectionSettings = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await whatsAppCloudConfigService.getMaskedConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateConnectionSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = (req.admin as any)?.id || (req.admin as any)?._id;
    const config = await whatsAppCloudConfigService.updateConfig({
      ...req.body,
      adminId,
    });
    res.status(200).json({
      success: true,
      message: 'WhatsApp Cloud API settings saved successfully',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const testConnection = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await whatsAppCloudConfigService.testConnection(req.body);
    res.status(200).json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetConnectionSettings = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await whatsAppCloudConfigService.resetConfig();
    res.status(200).json({
      success: true,
      message: 'WhatsApp Cloud API settings reset to defaults',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// --- META TEMPLATES ---

export const getMetaTemplates = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templates = await MetaTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

export const syncMetaTemplates = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const creds = await whatsAppCloudConfigService.getDecryptedConfig();
    const result = await metaGraphApiService.syncTemplates(creds);
    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${result.count} Meta message templates`,
      data: result.templates,
    });
  } catch (error) {
    next(error);
  }
};

export const getMetaTemplateById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await MetaTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ success: false, message: 'Meta template not found' });
      return;
    }
    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// --- WEBHOOK EVENTS ---

export const getWebhookEvents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const eventType = req.query.eventType as string;
    const processingStatus = req.query.processingStatus as string;

    const filter: any = {};
    if (eventType) filter.eventType = eventType;
    if (processingStatus) filter.processingStatus = processingStatus;

    const [events, total] = await Promise.all([
      WhatsAppWebhookEvent.find(filter)
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WhatsAppWebhookEvent.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        events,
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

export const getWebhookEventById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await WhatsAppWebhookEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Webhook event not found' });
      return;
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

export const reprocessWebhookEvent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await WhatsAppWebhookEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Webhook event not found' });
      return;
    }

    const result = await webhookProcessorService.processWebhook(
      { entry: [{ changes: [{ field: event.eventType, value: event.payload }] }] },
      event.signatureVerified
    );

    res.status(200).json({
      success: true,
      message: 'Webhook event reprocessed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// --- INBOUND MESSAGES ---

export const getInboundMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (status) filter.processingStatus = status;
    if (search) {
      filter.$or = [
        { senderPhoneNumber: { $regex: search, $options: 'i' } },
        { senderName: { $regex: search, $options: 'i' } },
        { textBody: { $regex: search, $options: 'i' } },
      ];
    }

    const [messages, total, unreadCount] = await Promise.all([
      WhatsAppInboundMessage.find(filter)
        .populate('linkedCandidateId', 'fullName phoneNumber email collegeName placementStatus')
        .populate('linkedCampaignId', 'name campaignId')
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WhatsAppInboundMessage.countDocuments(filter),
      WhatsAppInboundMessage.countDocuments({ processingStatus: 'UNREAD' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        messages,
        unreadCount,
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

export const updateInboundMessageStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const message = await WhatsAppInboundMessage.findByIdAndUpdate(
      req.params.id,
      { processingStatus: status },
      { new: true }
    );
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const linkCandidateToMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { candidateId } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    const message = await WhatsAppInboundMessage.findByIdAndUpdate(
      req.params.id,
      {
        linkedCandidateId: candidate._id,
        senderName: candidate.fullName,
      },
      { new: true }
    ).populate('linkedCandidateId');

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// --- SUPPRESSIONS (OPT-OUT) ---

export const getSuppressions = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const suppressions = await WhatsAppSuppression.find()
      .populate('candidateId', 'fullName email')
      .sort({ optedOutAt: -1 });
    res.status(200).json({ success: true, data: suppressions });
  } catch (error) {
    next(error);
  }
};

export const addSuppression = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber, reason } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ success: false, message: 'Phone number is required' });
      return;
    }

    const norm = normalizePhoneNumber(phoneNumber);
    const normalized = norm.isValid ? norm.normalized : (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`);
    const candidate = await Candidate.findOne({ normalizedPhoneNumber: normalized });

    const doc = await WhatsAppSuppression.findOneAndUpdate(
      { normalizedPhoneNumber: normalized },
      {
        phoneNumber,
        normalizedPhoneNumber: normalized,
        optedOutAt: new Date(),
        source: 'MANUAL_ADMIN',
        reason: reason || 'Manually added by administrator',
        candidateId: candidate?._id,
      },
      { upsert: true, new: true }
    );

    if (candidate) {
      candidate.whatsappConsent = false;
      await candidate.save();
    }

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

export const removeSuppression = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await WhatsAppSuppression.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Number removed from suppression list' });
  } catch (error) {
    next(error);
  }
};

// --- CLOUD CAMPAIGNS ---

export const validateCampaignForCloud = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await cloudCampaignSenderService.validateCampaign(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const startCloudCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await cloudCampaignSenderService.startDispatch(req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const pauseCloudCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const success = await cloudCampaignSenderService.pauseDispatch(req.params.id);
    res.status(200).json({ success, message: 'Campaign paused successfully' });
  } catch (error) {
    next(error);
  }
};

export const resumeCloudCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const success = await cloudCampaignSenderService.resumeDispatch(req.params.id);
    res.status(200).json({ success, message: 'Campaign resumed successfully' });
  } catch (error) {
    next(error);
  }
};

export const cancelCloudCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const success = await cloudCampaignSenderService.cancelDispatch(req.params.id);
    res.status(200).json({ success, message: 'Campaign cancelled' });
  } catch (error) {
    next(error);
  }
};
