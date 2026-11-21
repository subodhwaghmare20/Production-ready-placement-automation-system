import { Router } from 'express';
import {
  getConnectionSettings,
  updateConnectionSettings,
  testConnection,
  resetConnectionSettings,
  getMetaTemplates,
  syncMetaTemplates,
  getMetaTemplateById,
  getWebhookEvents,
  getWebhookEventById,
  reprocessWebhookEvent,
  getInboundMessages,
  updateInboundMessageStatus,
  linkCandidateToMessage,
  getSuppressions,
  addSuppression,
  removeSuppression,
  validateCampaignForCloud,
  startCloudCampaign,
  pauseCloudCampaign,
  resumeCloudCampaign,
  cancelCloudCampaign,
} from '../controllers/whatsappCloud.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all Cloud API management endpoints with Admin JWT
router.use(authMiddleware);

// Connection Settings
router.get('/connection', getConnectionSettings);
router.put('/connection', updateConnectionSettings);
router.post('/test-connection', testConnection);
router.delete('/connection', resetConnectionSettings);

// Meta Templates
router.get('/templates', getMetaTemplates);
router.post('/templates/sync', syncMetaTemplates);
router.get('/templates/:id', getMetaTemplateById);

// Webhook Audit Events
router.get('/webhook-events', getWebhookEvents);
router.get('/webhook-events/:id', getWebhookEventById);
router.post('/webhook-events/:id/reprocess', reprocessWebhookEvent);

// Inbound Messages
router.get('/inbound-messages', getInboundMessages);
router.patch('/inbound-messages/:id', updateInboundMessageStatus);
router.post('/inbound-messages/:id/link-candidate', linkCandidateToMessage);

// Suppressions (Opt-out)
router.get('/suppressions', getSuppressions);
router.post('/suppressions', addSuppression);
router.delete('/suppressions/:id', removeSuppression);

// Cloud Campaigns Execution
router.post('/campaigns/:id/validate', validateCampaignForCloud);
router.post('/campaigns/:id/start', startCloudCampaign);
router.post('/campaigns/:id/pause', pauseCloudCampaign);
router.post('/campaigns/:id/resume', resumeCloudCampaign);
router.post('/campaigns/:id/cancel', cancelCloudCampaign);

export default router;
