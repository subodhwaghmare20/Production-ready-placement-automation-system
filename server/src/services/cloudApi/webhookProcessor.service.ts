import { WhatsAppWebhookEvent } from '../../models/WhatsAppWebhookEvent.model';
import { CampaignRecipient } from '../../models/CampaignRecipient.model';
import { Campaign } from '../../models/Campaign.model';
import { Candidate } from '../../models/Candidate.model';
import { WhatsAppInboundMessage, InboundMessageType } from '../../models/WhatsAppInboundMessage.model';
import { WhatsAppSuppression } from '../../models/WhatsAppSuppression.model';
import { normalizePhoneNumber } from '../../utils/phoneNormalizer';

// Progression ranking to avoid out-of-order downgrade
const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  READY: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: -1,
};

export class WebhookProcessorService {
  /**
   * Processes an incoming WhatsApp Cloud API webhook payload
   */
  async processWebhook(
    payload: any,
    signatureVerified: boolean,
    rawSignature?: string
  ): Promise<{ processed: boolean; eventsLogged: number; statusesUpdated: number; inboundSaved: number }> {
    let eventsLogged = 0;
    let statusesUpdated = 0;
    let inboundSaved = 0;

    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const field = change?.field;
        const value = change?.value;
        if (!value) continue;

        const eventId = `wh_evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const eventType = field || 'unknown';

        // 1. Log incoming event for audit trail
        const webhookEventDoc = await WhatsAppWebhookEvent.create({
          eventId,
          eventType,
          provider: 'CLOUD_API',
          payload: value,
          signatureVerified,
          processingStatus: 'PENDING',
          receivedAt: new Date(),
        });
        eventsLogged++;

        try {
          // 2. Handle Status Updates (sent, delivered, read, failed)
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const providerMsgId = statusObj.id;
              const metaStatus = (statusObj.status || '').toUpperCase() as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
              const timestamp = statusObj.timestamp
                ? new Date(parseInt(statusObj.timestamp, 10) * 1000)
                : new Date();

              if (!providerMsgId || !metaStatus) continue;

              const recipient = await CampaignRecipient.findOne({
                providerMessageId: providerMsgId,
              });

              if (recipient) {
                const currentRank = STATUS_RANK[recipient.providerStatus || 'PENDING'] || 0;
                const newRank = STATUS_RANK[metaStatus] || 0;

                // Protect against out-of-order downgrades (e.g., SENT arrives after DELIVERED)
                const shouldUpdateStatus =
                  metaStatus === 'FAILED' || newRank >= currentRank;

                if (shouldUpdateStatus) {
                  recipient.providerStatus = metaStatus;
                }

                if (metaStatus === 'SENT' && !recipient.sentAt) {
                  recipient.sentAt = timestamp;
                } else if (metaStatus === 'DELIVERED' && !recipient.deliveredAt) {
                  recipient.deliveredAt = timestamp;
                } else if (metaStatus === 'READ') {
                  recipient.readAt = timestamp;
                  if (!recipient.deliveredAt) recipient.deliveredAt = timestamp;
                } else if (metaStatus === 'FAILED') {
                  recipient.failedAt = timestamp;
                  const errDetails = statusObj.errors?.[0];
                  if (errDetails) {
                    recipient.providerErrorCode = String(errDetails.code || '');
                    recipient.providerErrorMessage = errDetails.title || errDetails.message || 'WhatsApp delivery failed';
                  }
                }

                // Add to webhook attempt/history
                if (!recipient.providerWebhookEvents) {
                  recipient.providerWebhookEvents = [];
                }
                recipient.providerWebhookEvents.push({
                  eventType: `STATUS_${metaStatus}`,
                  timestamp,
                  payload: statusObj,
                });

                await recipient.save();
                statusesUpdated++;

                // Recalculate campaign metrics
                await this.updateCampaignMetrics(recipient.campaignId);
              }
            }
          }

          // 3. Handle Inbound Messages
          if (value.messages && Array.isArray(value.messages)) {
            for (const msgObj of value.messages) {
              const msgId = msgObj.id;
              const from = msgObj.from;
              const type = (msgObj.type || 'text') as InboundMessageType;
              const timestamp = msgObj.timestamp
                ? new Date(parseInt(msgObj.timestamp, 10) * 1000)
                : new Date();

              const norm = normalizePhoneNumber(from);
              const normalizedPhone = norm.isValid ? norm.normalized : (from.startsWith('+') ? from : `+${from}`);
              const textBody =
                type === 'text'
                  ? msgObj.text?.body
                  : type === 'button'
                  ? msgObj.button?.text
                  : type === 'interactive'
                  ? msgObj.interactive?.button_reply?.title || msgObj.interactive?.list_reply?.title
                  : undefined;

              // Check for Opt-Out intent (e.g. STOP, UNSUBSCRIBE, QUIT, CANCEL, OPT OUT)
              const cleanText = (textBody || '').trim().toUpperCase();
              const isOptOut = /^(STOP|UNSUBSCRIBE|CANCEL|QUIT|OPTOUT|OPT\s*OUT)$/i.test(cleanText);

              // Find candidate if matching phone exists
              const candidate = await Candidate.findOne({
                normalizedPhoneNumber: normalizedPhone,
              });

              if (isOptOut) {
                // Register into WhatsAppSuppression
                await WhatsAppSuppression.findOneAndUpdate(
                  { normalizedPhoneNumber: normalizedPhone },
                  {
                    phoneNumber: from,
                    normalizedPhoneNumber: normalizedPhone,
                    optedOutAt: new Date(),
                    source: 'INBOUND_STOP',
                    reason: `Candidate texted opt-out keyword: ${cleanText}`,
                    candidateId: candidate?._id,
                  },
                  { upsert: true, new: true }
                );

                // Revoke consent on candidate profile
                if (candidate) {
                  candidate.whatsappConsent = false;
                  await candidate.save();
                }
              }

              // Find recent campaign recipient for candidate
              let linkedCampaignId;
              if (candidate) {
                const recentRecipient = await CampaignRecipient.findOne({
                  candidateId: candidate._id,
                }).sort({ createdAt: -1 });
                if (recentRecipient) {
                  linkedCampaignId = recentRecipient.campaignId;
                }
              }

              // Extract media metadata if present
              let mediaMetadata;
              if (msgObj[type] && typeof msgObj[type] === 'object') {
                mediaMetadata = {
                  id: msgObj[type].id,
                  mimeType: msgObj[type].mime_type,
                  sha256: msgObj[type].sha256,
                  caption: msgObj[type].caption,
                  filename: msgObj[type].filename,
                };
              }

              await WhatsAppInboundMessage.findOneAndUpdate(
                { providerMessageId: msgId },
                {
                  providerMessageId: msgId,
                  senderPhoneNumber: from,
                  normalizedSenderPhoneNumber: normalizedPhone,
                  senderName: value.contacts?.[0]?.profile?.name || candidate?.fullName,
                  messageType: type,
                  textBody,
                  mediaMetadata,
                  rawPayload: msgObj,
                  receivedAt: timestamp,
                  linkedCandidateId: candidate?._id,
                  linkedCampaignId,
                  processingStatus: 'UNREAD',
                  isOptOutRequest: isOptOut,
                },
                { upsert: true, new: true }
              );
              inboundSaved++;
            }
          }

          webhookEventDoc.processingStatus = 'PROCESSED';
          webhookEventDoc.processedAt = new Date();
          await webhookEventDoc.save();
        } catch (err: any) {
          webhookEventDoc.processingStatus = 'FAILED';
          webhookEventDoc.errorMessage = err.message || 'Processing error';
          webhookEventDoc.processedAt = new Date();
          await webhookEventDoc.save();
        }
      }
    }

    return {
      processed: true,
      eventsLogged,
      statusesUpdated,
      inboundSaved,
    };
  }

  /**
   * Recalculates campaign delivery counts after status webhooks
   */
  private async updateCampaignMetrics(campaignId: any): Promise<void> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return;

      const [counts] = await CampaignRecipient.aggregate([
        { $match: { campaignId: campaign._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: {
              $sum: {
                $cond: [{ $in: ['$providerStatus', ['SENT', 'DELIVERED', 'READ']] }, 1, 0],
              },
            },
            delivered: {
              $sum: {
                $cond: [{ $in: ['$providerStatus', ['DELIVERED', 'READ']] }, 1, 0],
              },
            },
            read: {
              $sum: {
                $cond: [{ $eq: ['$providerStatus', 'READ'] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$providerStatus', 'FAILED'] }, 1, 0],
              },
            },
          },
        },
      ]);

      if (counts) {
        campaign.metrics.processedRecipients = counts.sent + counts.failed;
        if (campaign.metrics.processedRecipients >= campaign.metrics.eligibleRecipients && campaign.metrics.eligibleRecipients > 0) {
          if (campaign.status === 'IN_PROGRESS') {
            campaign.status = 'COMPLETED';
            campaign.completedAt = new Date();
          }
        }
        await campaign.save();
      }
    } catch (err) {
      console.error('Error recalculating campaign delivery metrics:', err);
    }
  }
}

export const webhookProcessorService = new WebhookProcessorService();
