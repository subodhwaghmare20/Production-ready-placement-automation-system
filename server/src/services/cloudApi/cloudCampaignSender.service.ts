import { Campaign } from '../../models/Campaign.model';
import { CampaignRecipient } from '../../models/CampaignRecipient.model';
import { MetaTemplate } from '../../models/MetaTemplate.model';
import { WhatsAppSuppression } from '../../models/WhatsAppSuppression.model';
import { Candidate } from '../../models/Candidate.model';
import { metaGraphApiService } from './metaGraphApi.service';
import { whatsAppCloudConfigService } from './whatsappCloudConfig.service';

export interface CampaignValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalEligible: number;
  suppressedCount: number;
  noConsentCount: number;
  readyToSendCount: number;
}

export class CloudCampaignSenderService {
  /**
   * Validates a campaign before Cloud API dispatch
   */
  async validateCampaign(campaignId: string): Promise<CampaignValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return {
        valid: false,
        errors: ['Campaign not found'],
        warnings: [],
        totalEligible: 0,
        suppressedCount: 0,
        noConsentCount: 0,
        readyToSendCount: 0,
      };
    }

    if (campaign.provider !== 'CLOUD_API') {
      errors.push('Campaign is configured for Personal WhatsApp Assisted mode, not WhatsApp Cloud API');
    }

    // 1. Verify Cloud API Configuration
    const cloudConfig = await whatsAppCloudConfigService.getDecryptedConfig();
    if (!cloudConfig || (cloudConfig.connectionStatus !== 'CONNECTED' && cloudConfig.connectionStatus !== 'TEST_MODE')) {
      errors.push('WhatsApp Cloud API is not connected or in test mode. Please configure credentials first.');
    }

    // 2. Verify Meta Template
    let metaTemplate = null;
    if (campaign.metaTemplateId) {
      metaTemplate = await MetaTemplate.findById(campaign.metaTemplateId);
    } else if (campaign.metaTemplateName) {
      metaTemplate = await MetaTemplate.findOne({ name: campaign.metaTemplateName });
    }

    if (!metaTemplate) {
      errors.push('No Meta Template associated with this Cloud API campaign');
    } else if (metaTemplate.status !== 'APPROVED') {
      errors.push(`Selected Meta template "${metaTemplate.name}" is not APPROVED (Current status: ${metaTemplate.status})`);
    }

    // 3. Check Recipients
    const recipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      isExcluded: false,
      isApproved: true,
    });

    const totalEligible = recipients.length;
    let suppressedCount = 0;
    let noConsentCount = 0;
    let readyToSendCount = 0;

    // Check suppression list
    const suppressedPhones = new Set(
      (await WhatsAppSuppression.find({}, { normalizedPhoneNumber: 1 })).map(
        (s) => s.normalizedPhoneNumber
      )
    );

    for (const recipient of recipients) {
      if (suppressedPhones.has(recipient.normalizedPhoneNumber)) {
        suppressedCount++;
        continue;
      }

      // Check Candidate record for consent
      const candidate = await Candidate.findById(recipient.candidateId);
      if (candidate && candidate.whatsappConsent === false) {
        noConsentCount++;
        continue;
      }

      readyToSendCount++;
    }

    if (suppressedCount > 0) {
      warnings.push(`${suppressedCount} recipient(s) are in the opt-out suppression list and will be skipped`);
    }
    if (noConsentCount > 0) {
      warnings.push(`${noConsentCount} recipient(s) have revoked WhatsApp messaging consent and will be skipped`);
    }
    if (readyToSendCount === 0) {
      errors.push('No recipients are ready or eligible to receive messages via Cloud API');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalEligible,
      suppressedCount,
      noConsentCount,
      readyToSendCount,
    };
  }

  /**
   * Starts or resumes automated sending for a Cloud API campaign
   */
  async startDispatch(
    campaignId: string,
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<{ started: boolean; dispatched: number; failed: number; skipped: number; remaining: number }> {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const validation = await this.validateCampaign(campaignId);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Fetch config
    const cloudConfig = await whatsAppCloudConfigService.getDecryptedConfig();
    const creds = {
      appId: cloudConfig.appId,
      appSecret: cloudConfig.appSecret,
      wabaId: cloudConfig.wabaId,
      phoneNumberId: cloudConfig.phoneNumberId,
      accessToken: cloudConfig.accessToken,
      graphApiVersion: cloudConfig.graphApiVersion,
      isMockMode: cloudConfig.isMockMode,
    };

    // Find Meta Template
    let metaTemplate = null;
    if (campaign.metaTemplateId) {
      metaTemplate = await MetaTemplate.findById(campaign.metaTemplateId);
    } else {
      metaTemplate = await MetaTemplate.findOne({ status: 'APPROVED' });
    }

    if (!metaTemplate) {
      throw new Error('No approved Meta Template available for sending');
    }

    // Update campaign status
    campaign.status = 'IN_PROGRESS';
    if (!campaign.startedAt) campaign.startedAt = new Date();
    await campaign.save();

    // Query pending recipients
    const recipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      isExcluded: false,
      isApproved: true,
      providerStatus: { $nin: ['SENT', 'DELIVERED', 'READ'] },
    }).sort({ queueOrder: 1 });

    const suppressedList = new Set(
      (await WhatsAppSuppression.find({}, { normalizedPhoneNumber: 1 })).map((s) => s.normalizedPhoneNumber)
    );

    let dispatched = 0;
    let failed = 0;
    let skipped = 0;
    const batchSize = options.batchSize || recipients.length;
    const delayMs = options.delayMs || 50;

    for (let i = 0; i < Math.min(recipients.length, batchSize); i++) {
      // Re-check if campaign was paused during loop
      const freshCampaign = await Campaign.findById(campaign._id);
      if (freshCampaign?.status === 'PAUSED' || freshCampaign?.status === 'CANCELLED') {
        break;
      }

      const recipient = recipients[i];

      // Check suppression
      if (suppressedList.has(recipient.normalizedPhoneNumber)) {
        recipient.isExcluded = true;
        recipient.exclusionReason = 'Opted out via suppression list';
        recipient.status = 'SKIPPED';
        await recipient.save();
        skipped++;
        continue;
      }

      // Check consent
      const candidate = await Candidate.findById(recipient.candidateId);
      if (candidate && candidate.whatsappConsent === false) {
        recipient.isExcluded = true;
        recipient.exclusionReason = 'Candidate consent missing/revoked';
        recipient.status = 'SKIPPED';
        await recipient.save();
        skipped++;
        continue;
      }

      // Prepare body parameters according to template parameterMappings
      const bodyParameters: string[] = [];
      if (metaTemplate.parameterMappings && metaTemplate.parameterMappings.length > 0) {
        for (const mapping of metaTemplate.parameterMappings) {
          let val = '';
          if (mapping.candidateField === 'fullName') {
            val = candidate?.fullName || recipient.candidateName;
          } else if (mapping.candidateField === 'companyName') {
            val = (campaign.metadata as any)?.companyName || 'Campus Placement';
          } else if (mapping.candidateField === 'jobRole') {
            val = campaign.metadata?.customJobRole || 'Software Engineer';
          } else if (mapping.candidateField === 'interviewDate') {
            val = campaign.metadata?.interviewDate || 'TBD';
          } else if (mapping.candidateField === 'interviewTime') {
            val = campaign.metadata?.interviewTime || 'TBD';
          } else if (mapping.candidateField === 'interviewLocation') {
            val = campaign.metadata?.interviewLocation || 'Online';
          } else {
            val = (candidate as any)?.[mapping.candidateField] || '';
          }
          bodyParameters.push(val);
        }
      } else {
        // Fallback default parameters
        bodyParameters.push(recipient.candidateName);
      }

      // Send via Meta Graph API
      const result = await metaGraphApiService.sendTemplateMessage(creds, {
        to: recipient.normalizedPhoneNumber,
        templateName: metaTemplate.name,
        languageCode: metaTemplate.language,
        bodyParameters,
      });

      if (result.success && result.providerMessageId) {
        recipient.provider = 'CLOUD_API';
        recipient.providerMessageId = result.providerMessageId;
        recipient.providerStatus = 'SENT';
        recipient.sentAt = new Date();
        recipient.status = 'SENT_MANUALLY_CONFIRMED';
        recipient.attemptHistory.push({
          attemptNumber: recipient.attemptHistory.length + 1,
          action: 'CLOUD_API_DISPATCH',
          status: 'SENT_MANUALLY_CONFIRMED',
          timestamp: new Date(),
          notes: `Sent via Meta Cloud API (${metaTemplate.name})`,
        });
        await recipient.save();
        dispatched++;
      } else {
        recipient.provider = 'CLOUD_API';
        recipient.providerStatus = 'FAILED';
        recipient.failedAt = new Date();
        recipient.providerErrorCode = String(result.error?.code || 'ERROR');
        recipient.providerErrorMessage = result.error?.message || 'Dispatch error';
        recipient.attemptHistory.push({
          attemptNumber: recipient.attemptHistory.length + 1,
          action: 'CLOUD_API_DISPATCH_FAILED',
          status: 'FAILED_TO_OPEN',
          timestamp: new Date(),
          errorDetails: result.error?.message,
        });
        await recipient.save();
        failed++;
      }

      // Small throttling delay to avoid spike
      if (delayMs > 0 && i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Update campaign counters
    const remaining = await CampaignRecipient.countDocuments({
      campaignId: campaign._id,
      isExcluded: false,
      isApproved: true,
      providerStatus: { $nin: ['SENT', 'DELIVERED', 'READ'] },
    });

    campaign.metrics.processedRecipients += dispatched + failed;
    if (remaining === 0) {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date();
    }
    await campaign.save();

    return {
      started: true,
      dispatched,
      failed,
      skipped,
      remaining,
    };
  }

  /**
   * Pauses an active Cloud API campaign
   */
  async pauseDispatch(campaignId: string): Promise<boolean> {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'IN_PROGRESS') {
      campaign.status = 'PAUSED';
      await campaign.save();
      return true;
    }
    return false;
  }

  /**
   * Resumes a paused Cloud API campaign
   */
  async resumeDispatch(campaignId: string): Promise<boolean> {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'PAUSED') {
      await this.startDispatch(campaignId);
      return true;
    }
    return false;
  }

  /**
   * Cancels a Cloud API campaign
   */
  async cancelDispatch(campaignId: string): Promise<boolean> {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    campaign.status = 'CANCELLED';
    await campaign.save();
    return true;
  }
}

export const cloudCampaignSenderService = new CloudCampaignSenderService();
