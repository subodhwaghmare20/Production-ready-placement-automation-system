import { Router } from 'express';
import {
  getOverview,
  getCampaignTrends,
  getRecipientStatus,
  getCompanyPerformance,
  getCampaigns,
  getCampaignById,
  getCampaignTimeline,
  compareCampaigns,
  getRecipients,
} from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Aggregations and Overview
router.get('/overview', getOverview);
router.get('/campaign-trends', getCampaignTrends);
router.get('/recipient-status', getRecipientStatus);
router.get('/company-performance', getCompanyPerformance);

// Comparison (before :id)
router.get('/campaigns/compare', compareCampaigns);

// Recipients tracking
router.get('/recipients', getRecipients);

// Campaign Analytics collection & details
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id', getCampaignById);
router.get('/campaigns/:id/timeline', getCampaignTimeline);
router.get('/campaigns/:id/recipients', getRecipients);

export default router;
