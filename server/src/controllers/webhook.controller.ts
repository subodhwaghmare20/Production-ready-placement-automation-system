import { Request, Response, NextFunction } from 'express';
import { whatsAppCloudConfigService } from '../services/cloudApi/whatsappCloudConfig.service';
import { webhookProcessorService } from '../services/cloudApi/webhookProcessor.service';
import { verifyMetaSignature } from '../utils/crypto';
import { env } from '../config/env';

/**
 * Handles Meta Webhook verification handshake (GET request)
 * Meta checks: hub.mode, hub.challenge, hub.verify_token
 */
export const verifyWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const config = await whatsAppCloudConfigService.getDecryptedConfig();
    const expectedToken = config.webhookVerifyToken || env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === expectedToken) {
      res.status(200).send(challenge);
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Webhook token verification failed. hub.verify_token does not match.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles incoming Meta Webhook event notifications (POST request)
 * Validates HMAC-SHA256 signature using raw body buffer and app secret
 */
export const handleWebhookPayload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const config = await whatsAppCloudConfigService.getDecryptedConfig();

    let signatureVerified = false;

    // Verify signature if appSecret is configured
    if (config.appSecret) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      signatureVerified = verifyMetaSignature(rawBody, signature, config.appSecret);

      if (!signatureVerified && !config.isMockMode && env.NODE_ENV !== 'test') {
        res.status(401).json({
          success: false,
          message: 'Invalid X-Hub-Signature-256 signature. Webhook payload rejected.',
        });
        return;
      }
    } else {
      // In test mode or when appSecret is omitted in development
      signatureVerified = true;
    }

    // Acknowledge immediately to Meta with HTTP 200 EVENT_RECEIVED as required
    res.status(200).send('EVENT_RECEIVED');

    // Asynchronously process webhook events in background
    webhookProcessorService
      .processWebhook(req.body, signatureVerified, signature)
      .catch((err) => {
        console.error('Error asynchronously processing WhatsApp webhook:', err);
      });
  } catch (error) {
    next(error);
  }
};
