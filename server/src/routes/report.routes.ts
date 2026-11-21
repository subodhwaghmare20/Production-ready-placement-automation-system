import { Router } from 'express';
import {
  getCampaignSummaryReport,
  getRecipientDetailsReport,
  getCompanyPerformanceReport,
  getMonthlyActivityReport,
  getFailedSkippedReport,
} from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/campaign-summary', getCampaignSummaryReport);
router.get('/recipient-details', getRecipientDetailsReport);
router.get('/company-performance', getCompanyPerformanceReport);
router.get('/monthly-activity', getMonthlyActivityReport);
router.get('/failed-skipped', getFailedSkippedReport);

export default router;
