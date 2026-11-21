import { Router } from 'express';
import {
  getMySessions,
  revokeMySession,
  revokeAllOtherSessions,
} from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/my-sessions', getMySessions);
router.post('/revoke/:sessionId', revokeMySession);
router.post('/revoke-all-others', revokeAllOtherSessions);

export default router;
