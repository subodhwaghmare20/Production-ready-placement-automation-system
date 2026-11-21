import mongoose from 'mongoose';
import { Campaign, ICampaign, CampaignStatus, ICampaignMetadata } from '../models/Campaign.model';
import {
  CampaignRecipient,
  ICampaignRecipient,
  RecipientStatus,
  PersonalizationStatus,
} from '../models/CampaignRecipient.model';
import { Company } from '../models/Company.model';
import { VirtualGroup } from '../models/VirtualGroup.model';
import { GroupMembership } from '../models/GroupMembership.model';
import { Candidate, ICandidate } from '../models/Candidate.model';
import { personalWhatsAppProvider } from './personalWhatsAppProvider.service';
import { placeholderService } from './placeholder.service';
import { templateService } from './template.service';
import { generateCampaignId } from '../utils/idGenerator';
import { normalizePhoneNumber } from '../utils/phoneNormalizer';
import { activityService } from './activity.service';

export interface PrepareCampaignInput {
  name: string;
  companyId: string;
  groupId: string;
  templateId?: string;
  metaTemplateId?: string;
  metaTemplateName?: string;
  provider?: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  messageContent: string;
  metadata?: ICampaignMetadata;
  adminId: string;
}

export interface ExcludedRecipientSummary {
  candidateId: string;
  candidateName: string;
  phoneNumber: string;
  reason: 'NO_WHATSAPP_CONSENT' | 'INVALID_PHONE_NUMBER' | 'INACTIVE_STATUS';
  details: string;
}

export class CampaignService {
  /**
   * Previews audience readiness before preparing campaign
   */
  async previewAudience(groupId: string): Promise<{
    group: any;
    totalMembers: number;
    consentedCount: number;
    unconsentedCount: number;
    eligibleCount: number;
    sampleRecipients: Array<{
      id: string;
      name: string;
      phone: string;
      consent: boolean;
      status: string;
    }>;
  }> {
    const group = await VirtualGroup.findOne({
      $or: [{ _id: groupId.match(/^[0-9a-fA-F]{24}$/) ? groupId : null }, { groupId }],
    }).populate('companyId', 'companyName jobRole');

    if (!group) {
      throw new Error('Virtual group not found');
    }

    const memberships = await GroupMembership.find({
      groupId: group._id,
      $or: [{ membershipStatus: 'Active' }, { status: 'Active' } as any],
    }).populate<{ candidateId: ICandidate }>('candidateId');

    let consentedCount = 0;
    let unconsentedCount = 0;
    let eligibleCount = 0;

    const sampleRecipients: Array<{
      id: string;
      name: string;
      phone: string;
      consent: boolean;
      status: string;
    }> = [];

    for (const m of memberships) {
      const c = m.candidateId;
      if (!c) continue;

      const hasConsent = Boolean(c.whatsappConsent);
      const phoneNorm = normalizePhoneNumber(c.phoneNumber);
      const isEligible = hasConsent && phoneNorm.isValid && c.placementStatus !== 'Inactive';

      if (hasConsent) consentedCount++;
      else unconsentedCount++;

      if (isEligible) eligibleCount++;

      if (sampleRecipients.length < 10) {
        sampleRecipients.push({
          id: c.candidateId,
          name: c.fullName,
          phone: c.phoneNumber,
          consent: hasConsent,
          status: isEligible ? 'Eligible' : !hasConsent ? 'No Consent' : 'Invalid Phone',
        });
      }
    }

    return {
      group,
      totalMembers: memberships.length,
      consentedCount,
      unconsentedCount,
      eligibleCount,
      sampleRecipients,
    };
  }

  /**
   * Prepares a WhatsApp messaging campaign.
   * Audits recipients, filters only opted-in candidates, personalizes templates,
   * generates official click-to-chat links, and saves campaign + recipients.
   */
  async createCampaign(input: PrepareCampaignInput): Promise<{
    campaign: ICampaign;
    eligibleRecipients: ICampaignRecipient[];
    excludedRecipients: ExcludedRecipientSummary[];
  }> {
    // 1. Resolve Company
    const company = await Company.findOne({
      $or: [
        { _id: input.companyId.match(/^[0-9a-fA-F]{24}$/) ? input.companyId : null },
        { companyId: input.companyId },
      ],
    });
    if (!company) {
      throw new Error('Target company not found');
    }

    // 2. Resolve Virtual Group
    const group = await VirtualGroup.findOne({
      $or: [
        { _id: input.groupId.match(/^[0-9a-fA-F]{24}$/) ? input.groupId : null },
        { groupId: input.groupId },
      ],
    });
    if (!group) {
      throw new Error('Target virtual group not found');
    }

    // 3. Resolve Active Memberships
    const memberships = await GroupMembership.find({
      groupId: group._id,
      $or: [{ membershipStatus: 'Active' }, { status: 'Active' } as any],
    }).populate<{ candidateId: ICandidate }>('candidateId');

    if (memberships.length === 0) {
      throw new Error('Virtual group has no active candidate members to prepare messages for.');
    }

    // 4. Recipient Audit & Personalization
    const eligibleRecipientsToCreate: Array<Partial<ICampaignRecipient>> = [];
    const excludedRecipients: ExcludedRecipientSummary[] = [];

    let queueCounter = 1;
    let validCount = 0;
    let warningCount = 0;
    let approvedCount = 0;

    for (const membership of memberships) {
      const candidate = membership.candidateId;
      if (!candidate) continue;

      // Rule: Inactive candidate status check
      if (candidate.placementStatus === 'Inactive') {
        excludedRecipients.push({
          candidateId: candidate.candidateId,
          candidateName: candidate.fullName,
          phoneNumber: candidate.phoneNumber,
          reason: 'INACTIVE_STATUS',
          details: 'Candidate placement status is marked as Inactive.',
        });
        continue;
      }

      // Rule: Explicit WhatsApp Consent Check
      if (!candidate.whatsappConsent) {
        excludedRecipients.push({
          candidateId: candidate.candidateId,
          candidateName: candidate.fullName,
          phoneNumber: candidate.phoneNumber,
          reason: 'NO_WHATSAPP_CONSENT',
          details: 'Candidate has not granted explicit WhatsApp communication consent.',
        });
        continue;
      }

      // Rule: Valid Phone Number Normalization
      const normalizedPhoneResult = normalizePhoneNumber(
        candidate.normalizedPhoneNumber || candidate.phoneNumber
      );
      if (!normalizedPhoneResult.isValid || !normalizedPhoneResult.normalized) {
        excludedRecipients.push({
          candidateId: candidate.candidateId,
          candidateName: candidate.fullName,
          phoneNumber: candidate.phoneNumber,
          reason: 'INVALID_PHONE_NUMBER',
          details: normalizedPhoneResult.error || 'Invalid phone number format.',
        });
        continue;
      }

      // Module 8: Build variables and run placeholder personalization & validation
      const variables = placeholderService.buildVariables(
        candidate,
        company,
        input.metadata,
        { name: input.metadata?.adminName || 'Placement Cell' }
      );

      const personalization = placeholderService.personalizeAndValidate(
        input.messageContent,
        variables
      );

      const clickToChatUrl = personalWhatsAppProvider.generateClickToChatUrl(
        normalizedPhoneResult.normalized,
        personalization.personalizedMessage
      );

      const isClean = personalization.status === 'VALID';
      if (isClean) {
        validCount++;
        approvedCount++;
      } else {
        warningCount++;
      }

      eligibleRecipientsToCreate.push({
        candidateId: candidate._id as unknown as mongoose.Types.ObjectId,
        candidateName: candidate.fullName,
        phoneNumber: candidate.phoneNumber,
        normalizedPhoneNumber: normalizedPhoneResult.normalized,
        personalizedMessage: personalization.personalizedMessage,
        clickToChatUrl,
        provider: input.provider || 'PERSONAL_ASSISTED',
        status: 'READY',
        queueOrder: queueCounter++,
        originalTemplateId: input.templateId ? new mongoose.Types.ObjectId(input.templateId) : undefined,
        originalTemplateContent: input.messageContent,
        personalizationStatus: personalization.status,
        missingFields: personalization.missingFields,
        validationErrors: personalization.validationErrors,
        manuallyEdited: false,
        isApproved: true, // Default to true so standard campaigns flow seamlessly
        isExcluded: false,
      });
    }

    if (eligibleRecipientsToCreate.length === 0) {
      throw new Error(
        `No eligible recipients found. All ${memberships.length} group members were excluded (e.g. missing WhatsApp consent or invalid numbers).`
      );
    }

    // 5. Create Campaign Record
    const campaignId = generateCampaignId();
    const campaign = await Campaign.create({
      campaignId,
      name: input.name.trim(),
      companyId: company._id,
      groupId: group._id,
      templateId: input.templateId ? new mongoose.Types.ObjectId(input.templateId) : undefined,
      metaTemplateId: input.metaTemplateId ? new mongoose.Types.ObjectId(input.metaTemplateId) : undefined,
      metaTemplateName: input.metaTemplateName,
      messageTemplateContent: input.messageContent,
      provider: input.provider || 'PERSONAL_ASSISTED',
      status: 'PREPARED',
      metrics: {
        totalRecipients: memberships.length,
        eligibleRecipients: eligibleRecipientsToCreate.length,
        excludedNoConsent: excludedRecipients.filter((r) => r.reason === 'NO_WHATSAPP_CONSENT').length,
        excludedInvalidPhone: excludedRecipients.filter((r) => r.reason === 'INVALID_PHONE_NUMBER').length,
        processedRecipients: 0,
        chatOpenedCount: 0,
        manuallyConfirmedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        validCount,
        warningCount,
        manuallyEditedCount: 0,
        approvedCount,
        excludedCount: 0,
      },
      metadata: input.metadata || {},
      currentRecipientIndex: 0,
      createdBy: new mongoose.Types.ObjectId(input.adminId),
    });

    // Track template usage
    if (input.templateId) {
      await templateService.incrementUsage(input.templateId);
    }

    // 6. Bulk Insert Campaign Recipients
    const now = new Date();
    const recipientsWithCampaignId = eligibleRecipientsToCreate.map((r) => ({
      ...r,
      campaignId: campaign._id,
      preparedAt: now,
      attemptHistory: [],
    }));

    const insertedRecipients = await CampaignRecipient.insertMany(recipientsWithCampaignId);

    // Module 9: Log initial campaign lifecycle events
    await activityService.logActivity({
      campaignId: campaign._id,
      eventType: 'CAMPAIGN_CREATED',
      description: `Campaign "${campaign.name}" created for company "${company.companyName}"`,
      performedBy: input.adminId,
    });

    await activityService.logActivity({
      campaignId: campaign._id,
      eventType: 'RECIPIENTS_PREPARED',
      description: `Prepared ${insertedRecipients.length} eligible recipients from Virtual Group "${group.groupName}"`,
      performedBy: input.adminId,
      metadata: {
        totalMembers: memberships.length,
        eligibleCount: insertedRecipients.length,
        excludedCount: excludedRecipients.length,
      },
    });

    await activityService.logActivity({
      campaignId: campaign._id,
      eventType: 'PERSONALIZATION_COMPLETED',
      description: `Personalization complete: ${validCount} valid, ${warningCount} warnings, ${approvedCount} approved`,
      performedBy: input.adminId,
    });

    return {
      campaign,
      eligibleRecipients: insertedRecipients as unknown as ICampaignRecipient[],
      excludedRecipients,
    };
  }

  /**
   * Get all campaigns with filters and pagination
   */
  async getCampaigns(options: {
    status?: CampaignStatus;
    companyId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    campaigns: ICampaign[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (options.status) {
      query.status = options.status;
    }
    if (options.companyId) {
      query.companyId = options.companyId.match(/^[0-9a-fA-F]{24}$/)
        ? options.companyId
        : null;
    }
    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { campaignId: { $regex: options.search, $options: 'i' } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('companyId', 'companyName companyId jobRole')
        .populate('groupId', 'groupName groupId')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Campaign.countDocuments(query),
    ]);

    return {
      campaigns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single campaign by ID
   */
  async getCampaignById(id: string): Promise<ICampaign | null> {
    return Campaign.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { campaignId: id }],
    })
      .populate('companyId', 'companyName companyId jobRole industry website hrName hrPhone salaryPackage jobLocation workMode interviewDate interviewLocation interviewMode')
      .populate('groupId', 'groupName groupId memberCount')
      .populate('templateId', 'name category subject language')
      .populate('createdBy', 'name email');
  }

  /**
   * Get campaign recipients list with optional status filtering
   */
  async getCampaignRecipients(
    campaignId: string,
    filters: {
      status?: string;
      personalizationStatus?: string;
      isApproved?: boolean;
      isExcluded?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    recipients: ICampaignRecipient[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const query: Record<string, unknown> = { campaignId: campaign._id };

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.personalizationStatus && filters.personalizationStatus !== 'ALL') {
      query.personalizationStatus = filters.personalizationStatus;
    }

    if (filters.isApproved !== undefined) {
      query.isApproved = filters.isApproved;
    }

    if (filters.isExcluded !== undefined) {
      query.isExcluded = filters.isExcluded;
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [recipients, total] = await Promise.all([
      CampaignRecipient.find(query)
        .populate(
          'candidateId',
          'candidateId fullName collegeName degree branch passingYear skills email phoneNumber placementStatus'
        )
        .sort({ queueOrder: 1 })
        .skip(skip)
        .limit(limit),
      CampaignRecipient.countDocuments(query),
    ]);

    return {
      recipients,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Module 8: Get Bulk Validation Summary for a Campaign
   */
  async getValidationSummary(campaignId: string) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const recipients = await CampaignRecipient.find({ campaignId: campaign._id });

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let manuallyEditedCount = 0;
    let approvedCount = 0;
    let excludedCount = 0;
    const missingFieldFrequency: Record<string, number> = {};

    for (const r of recipients) {
      if (r.isExcluded) excludedCount++;
      if (r.isApproved && !r.isExcluded) approvedCount++;
      if (r.manuallyEdited) manuallyEditedCount++;

      if (r.personalizationStatus === 'VALID') validCount++;
      else if (r.personalizationStatus === 'WARNING_MISSING_DATA') warningCount++;
      else if (r.personalizationStatus === 'INVALID_PLACEHOLDERS') errorCount++;

      if (r.missingFields && r.missingFields.length > 0) {
        for (const f of r.missingFields) {
          missingFieldFrequency[f] = (missingFieldFrequency[f] || 0) + 1;
        }
      }
    }

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.name,
      totalRecipients: recipients.length,
      validCount,
      warningCount,
      errorCount,
      manuallyEditedCount,
      approvedCount,
      excludedCount,
      missingFieldFrequency,
      canStartSending: approvedCount > 0,
    };
  }

  /**
   * Module 8: Individual Recipient Preview with details & variables
   */
  async getRecipientPreview(campaignId: string, recipientId: string) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    }).populate('candidateId');

    if (!recipient) throw new Error('Recipient not found');

    const company = campaign.companyId as any;
    const candidate = recipient.candidateId as any;

    const variables = placeholderService.buildVariables(
      candidate,
      company,
      campaign.metadata,
      { name: campaign.metadata?.adminName || 'Placement Cell' }
    );

    return {
      recipient,
      candidate,
      company,
      campaign,
      variablesUsed: variables,
    };
  }

  /**
   * Module 8: Candidate-level Message Editing
   * Modifies only this candidate's message and regenerates clickToChatUrl.
   * Leaves original template and other candidates untouched.
   */
  async updateRecipientMessage(
    campaignId: string,
    recipientId: string,
    newMessage: string,
    adminId?: string
  ): Promise<ICampaignRecipient> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    });
    if (!recipient) throw new Error('Recipient not found');

    if (!newMessage || !newMessage.trim()) {
      throw new Error('Message content cannot be empty');
    }

    recipient.personalizedMessage = newMessage.trim();
    recipient.clickToChatUrl = personalWhatsAppProvider.generateClickToChatUrl(
      recipient.normalizedPhoneNumber,
      recipient.personalizedMessage
    );
    recipient.manuallyEdited = true;
    recipient.personalizationStatus = 'MANUALLY_EDITED';
    recipient.validationErrors = [];
    recipient.isApproved = true;
    recipient.approvedAt = new Date();
    if (adminId) recipient.approvedBy = new mongoose.Types.ObjectId(adminId);

    await recipient.save();

    // Update campaign metrics
    await this.refreshCampaignMetrics(campaign._id.toString());

    await activityService.logActivity({
      campaignId: campaign._id,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'RECIPIENT_OVERRIDE',
      description: `Administrator customized message for ${recipient.candidateName}`,
      performedBy: adminId,
    });

    return recipient;
  }

  /**
   * Module 8: Reset candidate message to original template content
   */
  async resetRecipientMessage(
    campaignId: string,
    recipientId: string
  ): Promise<ICampaignRecipient> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    }).populate('candidateId');
    if (!recipient) throw new Error('Recipient not found');

    const templateContent =
      recipient.originalTemplateContent || campaign.messageTemplateContent;

    const company = campaign.companyId as any;
    const candidate = recipient.candidateId as any;

    const variables = placeholderService.buildVariables(
      candidate,
      company,
      campaign.metadata,
      { name: campaign.metadata?.adminName || 'Placement Cell' }
    );

    const result = placeholderService.personalizeAndValidate(templateContent, variables);

    recipient.personalizedMessage = result.personalizedMessage;
    recipient.clickToChatUrl = personalWhatsAppProvider.generateClickToChatUrl(
      recipient.normalizedPhoneNumber,
      recipient.personalizedMessage
    );
    recipient.manuallyEdited = false;
    recipient.personalizationStatus = result.status;
    recipient.missingFields = result.missingFields;
    recipient.validationErrors = result.validationErrors;
    recipient.isApproved = result.status === 'VALID';

    await recipient.save();
    await this.refreshCampaignMetrics(campaign._id.toString());

    return recipient;
  }

  /**
   * Module 8: Approve individual candidate message
   */
  async approveRecipient(
    campaignId: string,
    recipientId: string,
    adminId?: string
  ): Promise<ICampaignRecipient> {
    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId,
    });
    if (!recipient) throw new Error('Recipient not found');

    recipient.isApproved = true;
    recipient.isExcluded = false;
    recipient.approvedAt = new Date();
    if (adminId) recipient.approvedBy = new mongoose.Types.ObjectId(adminId);
    await recipient.save();

    await this.refreshCampaignMetrics(campaignId);

    await activityService.logActivity({
      campaignId,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'RECIPIENT_APPROVED',
      description: `Recipient ${recipient.candidateName} approved for messaging`,
      performedBy: adminId,
    });

    return recipient;
  }

  /**
   * Module 8: Exclude candidate from messaging
   */
  async excludeRecipient(
    campaignId: string,
    recipientId: string,
    reason?: string,
    adminId?: string
  ): Promise<ICampaignRecipient> {
    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId,
    });
    if (!recipient) throw new Error('Recipient not found');

    recipient.isExcluded = true;
    recipient.exclusionReason = reason || 'Excluded by administrator';
    recipient.personalizationStatus = 'EXCLUDED';
    await recipient.save();

    await this.refreshCampaignMetrics(campaignId);

    await activityService.logActivity({
      campaignId,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'RECIPIENT_EXCLUDED',
      description: `Excluded ${recipient.candidateName}: ${recipient.exclusionReason}`,
      performedBy: adminId,
    });

    return recipient;
  }

  /**
   * Module 8: Bulk Approve All Valid Messages
   */
  async approveAllValid(campaignId: string, adminId?: string): Promise<{ approvedCount: number }> {
    const res = await CampaignRecipient.updateMany(
      {
        campaignId,
        personalizationStatus: { $in: ['VALID', 'MANUALLY_EDITED'] },
        isExcluded: false,
      },
      {
        $set: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
        },
      }
    );

    await this.refreshCampaignMetrics(campaignId);
    return { approvedCount: res.modifiedCount };
  }

  /**
   * Module 8: Bulk Exclude All Incomplete Candidates
   */
  async excludeAllIncomplete(
    campaignId: string,
    reason?: string
  ): Promise<{ excludedCount: number }> {
    const res = await CampaignRecipient.updateMany(
      {
        campaignId,
        personalizationStatus: { $in: ['WARNING_MISSING_DATA', 'INVALID_PLACEHOLDERS'] },
        manuallyEdited: false,
      },
      {
        $set: {
          isExcluded: true,
          exclusionReason: reason || 'Excluded due to missing source data',
          personalizationStatus: 'EXCLUDED',
        },
      }
    );

    await this.refreshCampaignMetrics(campaignId);
    return { excludedCount: res.modifiedCount };
  }

  /**
   * Refreshes campaign metrics
   */
  private async refreshCampaignMetrics(campaignId: string): Promise<void> {
    const [recipients, campaign] = await Promise.all([
      CampaignRecipient.find({ campaignId }),
      Campaign.findById(campaignId),
    ]);

    if (!campaign) return;

    let validCount = 0;
    let warningCount = 0;
    let manuallyEditedCount = 0;
    let approvedCount = 0;
    let excludedCount = 0;

    for (const r of recipients) {
      if (r.isExcluded) excludedCount++;
      if (r.isApproved && !r.isExcluded) approvedCount++;
      if (r.manuallyEdited) manuallyEditedCount++;
      if (r.personalizationStatus === 'VALID') validCount++;
      else if (r.personalizationStatus === 'WARNING_MISSING_DATA') warningCount++;
    }

    campaign.metrics.validCount = validCount;
    campaign.metrics.warningCount = warningCount;
    campaign.metrics.manuallyEditedCount = manuallyEditedCount;
    campaign.metrics.approvedCount = approvedCount;
    campaign.metrics.excludedCount = excludedCount;
    await campaign.save();
  }

  /**
   * Get the next candidate in line for assisted sending.
   * Safeguard: Only serves approved, non-excluded recipients!
   */
  async getNextAssistedRecipient(campaignId: string): Promise<{
    campaign: ICampaign;
    recipient: ICampaignRecipient | null;
    currentIndex: number;
    totalEligible: number;
    remainingCount: number;
  }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Find first recipient that is READY or CHAT_OPENED, approved, and not excluded
    const recipient = await CampaignRecipient.findOne({
      campaignId: campaign._id,
      status: { $in: ['READY', 'CHAT_OPENED', 'PENDING'] },
      isExcluded: { $ne: true },
      isApproved: true,
    })
      .populate('candidateId', 'candidateId fullName collegeName degree branch passingYear placementStatus skills email')
      .sort({ queueOrder: 1 });

    const remainingCount = await CampaignRecipient.countDocuments({
      campaignId: campaign._id,
      status: { $in: ['READY', 'CHAT_OPENED', 'PENDING'] },
      isExcluded: { $ne: true },
      isApproved: true,
    });

    const currentIndex = recipient ? recipient.queueOrder : campaign.metrics.eligibleRecipients;

    return {
      campaign,
      recipient,
      currentIndex,
      totalEligible: campaign.metrics.eligibleRecipients,
      remainingCount,
    };
  }

  /**
   * Mark candidate chat as opened via wa.me link
   */
  async markChatOpened(
    campaignId: string,
    recipientId: string,
    adminId?: string,
    adminName?: string
  ): Promise<ICampaignRecipient> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    });
    if (!recipient) {
      throw new Error('Recipient not found in campaign');
    }

    if (recipient.status === 'READY' || recipient.status === 'PENDING') {
      recipient.status = 'CHAT_OPENED';
      recipient.chatOpenedAt = new Date();
      recipient.lastAttemptAt = new Date();
      if (adminId) recipient.lastActionBy = new mongoose.Types.ObjectId(adminId);
      if (adminName) recipient.lastActionByName = adminName;

      if (!recipient.attemptHistory) recipient.attemptHistory = [];
      recipient.attemptHistory.push({
        attemptNumber: recipient.attemptHistory.length + 1,
        action: 'CHAT_OPENED',
        status: 'CHAT_OPENED',
        timestamp: new Date(),
        performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
        performedByName: adminName || 'Administrator',
        notes: 'Opened WhatsApp Web/Desktop chat link',
      });

      await recipient.save();

      campaign.metrics.chatOpenedCount += 1;
      const isFirstStart = campaign.status === 'PREPARED' || campaign.status === 'READY';
      if (isFirstStart) {
        campaign.status = 'IN_PROGRESS';
        campaign.startedAt = new Date();
      }
      await campaign.save();

      if (isFirstStart) {
        await activityService.logActivity({
          campaignId: campaign._id,
          eventType: 'CAMPAIGN_STARTED',
          description: `Campaign messaging started by ${adminName || 'Administrator'}`,
          performedBy: adminId,
          performedByName: adminName,
        });
      }

      await activityService.logActivity({
        campaignId: campaign._id,
        recipientId: recipient._id,
        candidateName: recipient.candidateName,
        eventType: 'CHAT_OPENED',
        description: `Chat link opened for ${recipient.candidateName} (${recipient.normalizedPhoneNumber})`,
        performedBy: adminId,
        performedByName: adminName,
      });
    }

    return recipient;
  }

  /**
   * Mark recipient as confirmed sent by administrator after sending in WhatsApp
   */
  async confirmManualSend(
    campaignId: string,
    recipientId: string,
    notes?: string,
    adminId?: string,
    adminName?: string
  ): Promise<{
    recipient: ICampaignRecipient;
    campaign: ICampaign;
    isCompleted: boolean;
  }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    });
    if (!recipient) {
      throw new Error('Recipient not found in campaign');
    }

    const previousStatus = recipient.status;
    recipient.status = 'SENT_MANUALLY_CONFIRMED';
    recipient.manuallyConfirmedAt = new Date();
    recipient.lastAttemptAt = new Date();
    if (adminId) recipient.lastActionBy = new mongoose.Types.ObjectId(adminId);
    if (adminName) recipient.lastActionByName = adminName;
    if (notes) recipient.notes = notes;

    if (!recipient.attemptHistory) recipient.attemptHistory = [];
    recipient.attemptHistory.push({
      attemptNumber: recipient.attemptHistory.length + 1,
      action: 'CONFIRM_MANUAL_SEND',
      status: 'SENT_MANUALLY_CONFIRMED',
      timestamp: new Date(),
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      performedByName: adminName || 'Administrator',
      notes: notes || 'Manually confirmed sent in WhatsApp Web/Desktop',
    });

    await recipient.save();

    if (previousStatus !== 'SENT_MANUALLY_CONFIRMED') {
      campaign.metrics.manuallyConfirmedCount += 1;
      campaign.metrics.processedRecipients += 1;
      campaign.currentRecipientIndex = recipient.queueOrder;
    }

    let isCompleted = false;
    if (campaign.metrics.processedRecipients >= campaign.metrics.eligibleRecipients) {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date();
      isCompleted = true;
    } else if (campaign.status === 'PREPARED' || campaign.status === 'READY') {
      campaign.status = 'IN_PROGRESS';
      if (!campaign.startedAt) campaign.startedAt = new Date();
    }

    await campaign.save();

    await activityService.logActivity({
      campaignId: campaign._id,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'MESSAGE_MANUALLY_CONFIRMED',
      description: `Message manually confirmed as sent to ${recipient.candidateName}`,
      performedBy: adminId,
      performedByName: adminName,
    });

    if (isCompleted) {
      await activityService.logActivity({
        campaignId: campaign._id,
        eventType: 'CAMPAIGN_COMPLETED',
        description: `Campaign completed (${campaign.metrics.manuallyConfirmedCount} confirmed, ${campaign.metrics.skippedCount} skipped)`,
        performedBy: adminId,
        performedByName: adminName,
      });
    }

    return {
      recipient,
      campaign,
      isCompleted,
    };
  }

  /**
   * Skip recipient in queue
   */
  async skipRecipient(
    campaignId: string,
    recipientId: string,
    skipReason?: string,
    adminId?: string,
    adminName?: string
  ): Promise<{
    recipient: ICampaignRecipient;
    campaign: ICampaign;
    isCompleted: boolean;
  }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    });
    if (!recipient) {
      throw new Error('Recipient not found in campaign');
    }

    const previousStatus = recipient.status;
    recipient.status = 'SKIPPED';
    recipient.skippedAt = new Date();
    recipient.lastAttemptAt = new Date();
    recipient.skipReason = skipReason || 'Skipped by administrator';
    if (adminId) recipient.lastActionBy = new mongoose.Types.ObjectId(adminId);
    if (adminName) recipient.lastActionByName = adminName;

    if (!recipient.attemptHistory) recipient.attemptHistory = [];
    recipient.attemptHistory.push({
      attemptNumber: recipient.attemptHistory.length + 1,
      action: 'SKIP_RECIPIENT',
      status: 'SKIPPED',
      timestamp: new Date(),
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      performedByName: adminName || 'Administrator',
      notes: recipient.skipReason,
    });

    await recipient.save();

    if (previousStatus !== 'SKIPPED') {
      campaign.metrics.skippedCount += 1;
      campaign.metrics.processedRecipients += 1;
      campaign.currentRecipientIndex = recipient.queueOrder;
    }

    let isCompleted = false;
    if (campaign.metrics.processedRecipients >= campaign.metrics.eligibleRecipients) {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date();
      isCompleted = true;
    }

    await campaign.save();

    await activityService.logActivity({
      campaignId: campaign._id,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'RECIPIENT_SKIPPED',
      description: `Skipped ${recipient.candidateName}: ${recipient.skipReason}`,
      performedBy: adminId,
      performedByName: adminName,
    });

    if (isCompleted) {
      await activityService.logActivity({
        campaignId: campaign._id,
        eventType: 'CAMPAIGN_COMPLETED',
        description: `Campaign completed (${campaign.metrics.manuallyConfirmedCount} confirmed, ${campaign.metrics.skippedCount} skipped)`,
        performedBy: adminId,
        performedByName: adminName,
      });
    }

    return {
      recipient,
      campaign,
      isCompleted,
    };
  }

  /**
   * Mark candidate chat attempt as failed to open
   */
  async markChatFailed(
    campaignId: string,
    recipientId: string,
    errorDetails?: string,
    adminId?: string,
    adminName?: string
  ): Promise<{
    recipient: ICampaignRecipient;
    campaign: ICampaign;
  }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    });
    if (!recipient) {
      throw new Error('Recipient not found in campaign');
    }

    recipient.status = 'FAILED_TO_OPEN';
    recipient.lastAttemptAt = new Date();
    recipient.errorDetails = errorDetails || 'Failed to open WhatsApp chat link';
    if (adminId) recipient.lastActionBy = new mongoose.Types.ObjectId(adminId);
    if (adminName) recipient.lastActionByName = adminName;

    if (!recipient.attemptHistory) recipient.attemptHistory = [];
    recipient.attemptHistory.push({
      attemptNumber: recipient.attemptHistory.length + 1,
      action: 'CHAT_FAILED',
      status: 'FAILED_TO_OPEN',
      timestamp: new Date(),
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      performedByName: adminName || 'Administrator',
      errorDetails: recipient.errorDetails,
    });

    await recipient.save();

    campaign.metrics.failedCount += 1;
    await campaign.save();

    await activityService.logActivity({
      campaignId: campaign._id,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'CHAT_OPENING_FAILED',
      description: `Chat opening failed for ${recipient.candidateName}: ${recipient.errorDetails}`,
      performedBy: adminId,
      performedByName: adminName,
    });

    return { recipient, campaign };
  }

  /**
   * Retry sending to a failed or skipped recipient
   */
  async retryRecipient(
    campaignId: string,
    recipientId: string,
    adminId?: string,
    adminName?: string
  ): Promise<ICampaignRecipient> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const recipient = await CampaignRecipient.findOne({
      _id: recipientId,
      campaignId: campaign._id,
    });
    if (!recipient) throw new Error('Recipient not found');

    recipient.status = 'READY';
    recipient.errorDetails = undefined;
    recipient.lastAttemptAt = new Date();
    if (adminId) recipient.lastActionBy = new mongoose.Types.ObjectId(adminId);
    if (adminName) recipient.lastActionByName = adminName;

    if (!recipient.attemptHistory) recipient.attemptHistory = [];
    recipient.attemptHistory.push({
      attemptNumber: recipient.attemptHistory.length + 1,
      action: 'RETRY_RECIPIENT',
      status: 'READY',
      timestamp: new Date(),
      performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      performedByName: adminName || 'Administrator',
      notes: 'Returned recipient to READY queue for retry',
    });

    await recipient.save();

    await activityService.logActivity({
      campaignId: campaign._id,
      recipientId: recipient._id,
      candidateName: recipient.candidateName,
      eventType: 'RECIPIENT_APPROVED',
      description: `Recipient ${recipient.candidateName} returned to READY queue for retry`,
      performedBy: adminId,
      performedByName: adminName,
    });

    return recipient;
  }

  /**
   * Update campaign status (PAUSED, IN_PROGRESS, CANCELLED)
   */
  async updateCampaignStatus(
    campaignId: string,
    status: 'PAUSED' | 'IN_PROGRESS' | 'CANCELLED',
    adminId?: string,
    adminName?: string
  ): Promise<ICampaign> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status === 'COMPLETED') {
      throw new Error('Completed campaigns cannot change status.');
    }

    campaign.status = status;
    if (status === 'IN_PROGRESS' && !campaign.startedAt) {
      campaign.startedAt = new Date();
    }
    await campaign.save();

    const eventType =
      status === 'PAUSED'
        ? 'CAMPAIGN_PAUSED'
        : status === 'CANCELLED'
        ? 'CAMPAIGN_CANCELLED'
        : 'CAMPAIGN_RESUMED';

    await activityService.logActivity({
      campaignId: campaign._id,
      eventType,
      description: `Campaign status changed to ${status}`,
      performedBy: adminId,
      performedByName: adminName,
    });

    return campaign;
  }

  /**
   * Module 9 (Section 9): Future WhatsApp Cloud API Webhook Event Compatibility
   * Strictly separate from personal assisted mode.
   * Handles webhook events idempotently and preserves audit history.
   */
  async recordProviderWebhookEvent(
    providerMessageId: string,
    eventType: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    timestamp: Date,
    payload?: Record<string, unknown>
  ): Promise<ICampaignRecipient | null> {
    if (!providerMessageId) return null;

    const recipient = await CampaignRecipient.findOne({ providerMessageId });
    if (!recipient) return null;

    // Idempotency: verify this event wasn't already logged
    const isDuplicate = recipient.providerWebhookEvents?.some(
      (ev) =>
        ev.eventType === eventType &&
        Math.abs(new Date(ev.timestamp).getTime() - new Date(timestamp).getTime()) < 1000
    );
    if (isDuplicate) return recipient;

    recipient.providerStatus = eventType;
    if (!recipient.providerWebhookEvents) {
      recipient.providerWebhookEvents = [];
    }
    recipient.providerWebhookEvents.push({
      eventType,
      timestamp,
      payload,
    });

    await recipient.save();
    return recipient;
  }

  /**
   * Real database aggregation for WhatsApp Messaging Dashboard
   */
  async getDashboardStats(): Promise<{
    totalCampaigns: number;
    totalRecipients: number;
    messagesPrepared: number;
    messagesManuallyConfirmed: number;
    messagesFailed: number;
    pendingMessages: number;
    activeCampaigns: number;
    completedCampaigns: number;
  }> {
    const [
      totalCampaigns,
      totalRecipients,
      messagesPrepared,
      messagesManuallyConfirmed,
      messagesFailed,
      pendingMessages,
      activeCampaigns,
      completedCampaigns,
    ] = await Promise.all([
      Campaign.countDocuments(),
      CampaignRecipient.countDocuments(),
      CampaignRecipient.countDocuments({ status: { $in: ['READY', 'PENDING'] } }),
      CampaignRecipient.countDocuments({ status: 'SENT_MANUALLY_CONFIRMED' }),
      CampaignRecipient.countDocuments({ status: { $in: ['FAILED_TO_OPEN'] } }),
      CampaignRecipient.countDocuments({ status: { $in: ['READY', 'PENDING', 'CHAT_OPENED'] } }),
      Campaign.countDocuments({ status: { $in: ['PREPARED', 'IN_PROGRESS'] } }),
      Campaign.countDocuments({ status: 'COMPLETED' }),
    ]);

    return {
      totalCampaigns,
      totalRecipients,
      messagesPrepared,
      messagesManuallyConfirmed,
      messagesFailed,
      pendingMessages,
      activeCampaigns,
      completedCampaigns,
    };
  }
}

export const campaignService = new CampaignService();
