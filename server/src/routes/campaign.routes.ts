import { Router } from 'express';
import {
  getCampaignStats,
  previewAudience,
  createCampaign,
  getCampaigns,
  getCampaignById,
  getCampaignRecipients,
  getNextRecipient,
  markChatOpened,
  confirmManualSend,
  skipRecipient,
  markChatFailed,
  retryRecipient,
  updateCampaignStatus,
  getValidationSummary,
  getRecipientPreview,
  updateRecipientMessage,
  resetRecipientMessage,
  approveRecipient,
  excludeRecipient,
  approveAllValid,
  excludeAllIncomplete,
} from '../controllers/campaign.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Stats & Preview routes (before :id)
router.get('/stats', getCampaignStats);
router.get('/preview-audience/:groupId', previewAudience);

// Core campaign collection routes
router.get('/', getCampaigns);
router.post('/', createCampaign);

// Single campaign routes
router.get('/:id', getCampaignById);
router.patch('/:id/status', updateCampaignStatus);
router.get('/:id/recipients', getCampaignRecipients);
router.get('/:id/next', getNextRecipient);

// Module 8: Personalization & Campaign Validation Routes
router.get('/:id/validation-summary', getValidationSummary);
router.post('/:id/approve-all-valid', approveAllValid);
router.post('/:id/exclude-all-incomplete', excludeAllIncomplete);
router.get('/:id/recipients/:recipientId/preview', getRecipientPreview);
router.put('/:id/recipients/:recipientId/message', updateRecipientMessage);
router.post('/:id/recipients/:recipientId/reset', resetRecipientMessage);
router.post('/:id/recipients/:recipientId/approve', approveRecipient);
router.post('/:id/recipients/:recipientId/exclude', excludeRecipient);

// Assisted sender actions per recipient
router.post('/:id/recipients/:recipientId/open-chat', markChatOpened);
router.post('/:id/recipients/:recipientId/confirm-sent', confirmManualSend);
router.post('/:id/recipients/:recipientId/skip', skipRecipient);
router.post('/:id/recipients/:recipientId/mark-failed', markChatFailed);
router.post('/:id/recipients/:recipientId/retry', retryRecipient);

export default router;
