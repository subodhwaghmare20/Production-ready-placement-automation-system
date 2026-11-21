import { Router } from 'express';
import { verifyWebhook, handleWebhookPayload } from '../controllers/webhook.controller';

const router = Router();

// Public webhook endpoints (exempt from auth and CSRF)
router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', handleWebhookPayload);

export default router;
