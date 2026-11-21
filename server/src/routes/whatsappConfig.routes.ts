import { Router } from 'express';
import {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  testWhatsAppConnection,
} from '../controllers/whatsappConfig.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getWhatsAppSettings);
router.put('/', updateWhatsAppSettings);
router.post('/test', testWhatsAppConnection);

export default router;

