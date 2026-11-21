import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import createApp from './src/app';
import { WhatsAppCloudConfig } from './src/models/WhatsAppCloudConfig.model';
import { MetaTemplate } from './src/models/MetaTemplate.model';
import { WhatsAppWebhookEvent } from './src/models/WhatsAppWebhookEvent.model';
import { WhatsAppInboundMessage } from './src/models/WhatsAppInboundMessage.model';
import { WhatsAppSuppression } from './src/models/WhatsAppSuppression.model';
import { Candidate } from './src/models/Candidate.model';
import { Company } from './src/models/Company.model';
import { VirtualGroup } from './src/models/VirtualGroup.model';
import { GroupMembership } from './src/models/GroupMembership.model';
import { Campaign } from './src/models/Campaign.model';
import { CampaignRecipient } from './src/models/CampaignRecipient.model';
import { Admin } from './src/models/Admin.model';
import { encrypt, decrypt, maskSecret, verifyMetaSignature } from './src/utils/crypto';
import { whatsAppCloudConfigService } from './src/services/cloudApi/whatsappCloudConfig.service';
import { metaGraphApiService } from './src/services/cloudApi/metaGraphApi.service';
import { webhookProcessorService } from './src/services/cloudApi/webhookProcessor.service';
import { cloudCampaignSenderService } from './src/services/cloudApi/cloudCampaignSender.service';

const runTests = async () => {
  console.log('--- STARTING MODULE 10 AUTOMATED TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, desc: string) => {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  };

  // 1. Test Encryption, Decryption & Masking
  console.log('\n1. Security & Encryption Utility Tests:');
  const secretKey = 'EAABw_my_super_secret_meta_permanent_token_12345';
  const encrypted = encrypt(secretKey);
  const decrypted = decrypt(encrypted);
  assert(encrypted !== secretKey, 'Encrypted string is not plain text');
  assert(decrypted === secretKey, 'Decrypted string matches original plain text');
  assert(maskSecret(secretKey) === '••••••••2345', 'Secret masking leaves only last 4 chars visible');
  assert(maskSecret('••••••••2345') === '••••••••2345', 'Already masked secret is preserved');

  // Test Meta Signature Verification
  const payloadStr = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: { test: true } }] }] });
  const appSecret = 'my_meta_app_secret_9988';
  const validHmac = crypto.createHmac('sha256', appSecret).update(Buffer.from(payloadStr, 'utf8')).digest('hex');
  const validHeader = `sha256=${validHmac}`;
  const invalidHeader = `sha256=abcdef1234567890`;

  assert(verifyMetaSignature(payloadStr, validHeader, appSecret), 'Valid HMAC-SHA256 signature returns true');
  assert(!verifyMetaSignature(payloadStr, invalidHeader, appSecret), 'Invalid signature returns false');
  assert(!verifyMetaSignature(payloadStr, undefined, appSecret), 'Missing signature header returns false');

  // Start in-memory MongoDB
  console.log('\n2. Initializing In-Memory Database...');
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('  Connected to MongoMemoryServer.');

  // Create test Admin
  const admin = await Admin.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'superadmin',
  });

  // 3. Test Cloud Config Service
  console.log('\n3. WhatsApp Cloud Config Service Tests:');
  const initialConfig = await whatsAppCloudConfigService.getMaskedConfig();
  assert(initialConfig !== null, 'Initial config loaded with default values');

  const updatedConfig = await whatsAppCloudConfigService.updateConfig({
    appId: '1234567890',
    appSecret: 'test_meta_app_secret_9999',
    wabaId: 'waba_999999',
    phoneNumberId: 'phone_num_88888',
    accessToken: 'EAABw_sample_token_abcdef',
    webhookVerifyToken: 'my_custom_webhook_verify_token_123',
    isMockMode: true,
  });

  assert(updatedConfig.appId === '1234567890', 'App ID saved properly');
  assert(updatedConfig.appSecret.startsWith('••••'), 'App Secret is masked in output');
  assert(updatedConfig.accessToken.startsWith('••••'), 'Access Token is masked in output');

  const internalDecrypted = await whatsAppCloudConfigService.getDecryptedConfig();
  assert(internalDecrypted.appSecret === 'test_meta_app_secret_9999', 'Internal decrypted appSecret matches original');
  assert(internalDecrypted.accessToken === 'EAABw_sample_token_abcdef', 'Internal decrypted accessToken matches original');

  // Test Connection
  const testConnResult = await whatsAppCloudConfigService.testConnection();
  assert(testConnResult.success === true, 'Test Connection in test mode returns success');
  assert(testConnResult.connectionStatus === 'TEST_MODE', 'Connection status set to TEST_MODE');

  // 4. Test Meta Template Management & Synchronization
  console.log('\n4. Meta Template Synchronization Tests:');
  const syncResult = await metaGraphApiService.syncTemplates(internalDecrypted);
  assert(syncResult.count >= 3, `Synchronized ${syncResult.count} standard Meta templates`);
  const interviewTemplate = await MetaTemplate.findOne({ name: 'placement_interview_invitation' });
  assert(interviewTemplate !== null, 'Found standard "placement_interview_invitation" template');
  assert(interviewTemplate?.status === 'APPROVED', 'Template status is APPROVED');

  // 5. Test Candidate & Campaign Setup
  console.log('\n5. Candidate, Company & Cloud Campaign Setup:');
  const candidate = await Candidate.create({
    candidateId: 'CAND_101',
    fullName: 'Priya Patel',
    phoneNumber: '+919876543210',
    normalizedPhoneNumber: '+919876543210',
    email: 'priya@example.com',
    whatsappConsent: true,
    placementStatus: 'Available',
  });

  const candidateOptedOut = await Candidate.create({
    candidateId: 'CAND_102',
    fullName: 'Vikas Singh',
    phoneNumber: '+919876543211',
    normalizedPhoneNumber: '+919876543211',
    email: 'vikas@example.com',
    whatsappConsent: false, // No consent
    placementStatus: 'Available',
  });

  const company = await Company.create({
    companyId: 'COMP_01',
    companyName: 'Infosys Ltd',
    jobRole: 'Systems Engineer',
    requiredCandidates: 10,
    requiredSkills: ['Java', 'SQL'],
  });

  const group = await VirtualGroup.create({
    groupId: 'GRP_01',
    groupName: 'Infosys Drive 2026',
    companyId: company._id,
    memberCount: 2,
    status: 'Active',
  });

  await GroupMembership.create({
    groupId: group._id,
    candidateId: candidate._id,
    assignedAt: new Date(),
    membershipStatus: 'Active',
  });

  await GroupMembership.create({
    groupId: group._id,
    candidateId: candidateOptedOut._id,
    assignedAt: new Date(),
    membershipStatus: 'Active',
  });

  const campaign = await Campaign.create({
    campaignId: 'CAMP_101',
    name: 'Infosys Campus Outreach - Cloud API',
    companyId: company._id,
    groupId: group._id,
    metaTemplateId: interviewTemplate!._id,
    metaTemplateName: interviewTemplate!.name,
    messageTemplateContent: 'Hello {{candidateName}}, interview on {{interviewDate}}',
    provider: 'CLOUD_API',
    status: 'READY',
    metrics: {
      totalRecipients: 2,
      eligibleRecipients: 1,
      excludedNoConsent: 1,
      excludedInvalidPhone: 0,
      processedRecipients: 0,
      chatOpenedCount: 0,
      manuallyConfirmedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      validCount: 1,
      warningCount: 0,
      manuallyEditedCount: 0,
      approvedCount: 1,
      excludedCount: 0,
    },
    metadata: {
      interviewDate: '2026-12-01',
      interviewTime: '10:00 AM',
      interviewLocation: 'Campus Hall A',
      customJobRole: 'Systems Engineer',
    },
    currentRecipientIndex: 0,
    createdBy: admin._id,
  });

  const recipient = await CampaignRecipient.create({
    campaignId: campaign._id,
    candidateId: candidate._id,
    candidateName: candidate.fullName,
    phoneNumber: candidate.phoneNumber,
    normalizedPhoneNumber: candidate.normalizedPhoneNumber,
    personalizedMessage: 'Interview Invitation for Priya Patel',
    clickToChatUrl: 'https://wa.me/919876543210',
    provider: 'CLOUD_API',
    status: 'READY',
    queueOrder: 1,
    personalizationStatus: 'VALID',
    isApproved: true,
    isExcluded: false,
  });

  // 6. Test Campaign Validation & Cloud API Dispatch
  console.log('\n6. Cloud Campaign Sender & Dispatch Tests:');
  const valResult = await cloudCampaignSenderService.validateCampaign(campaign._id.toString());
  assert(valResult.valid === true, 'Campaign validation succeeds for eligible recipients');
  assert(valResult.readyToSendCount === 1, 'Correct readyToSendCount of 1 candidate');

  const dispatchResult = await cloudCampaignSenderService.startDispatch(campaign._id.toString());
  assert(dispatchResult.dispatched === 1, 'Successfully dispatched 1 message via Cloud API in mock mode');

  const dispatchedRecipient = await CampaignRecipient.findById(recipient._id);
  assert(dispatchedRecipient?.providerStatus === 'SENT', 'Recipient providerStatus set to SENT');
  assert(dispatchedRecipient?.providerMessageId !== undefined, `ProviderMessageId generated: ${dispatchedRecipient?.providerMessageId}`);
  assert(dispatchedRecipient?.sentAt !== undefined, 'Recipient sentAt timestamp recorded');

  // 7. Test Webhook Processor — Status Progression & Anti-Downgrade Hierarchy
  console.log('\n7. Webhook Status Progression & Anti-Downgrade Tests:');
  const providerMsgId = dispatchedRecipient!.providerMessageId!;

  // 7a. Deliver webhook event
  const deliveredWebhookPayload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              statuses: [
                {
                  id: providerMsgId,
                  status: 'delivered',
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  recipient_id: '919876543210',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookProcessorService.processWebhook(deliveredWebhookPayload, true);
  const deliveredRecipient = await CampaignRecipient.findById(recipient._id);
  assert(deliveredRecipient?.providerStatus === 'DELIVERED', 'Recipient status transitioned to DELIVERED');
  assert(deliveredRecipient?.deliveredAt !== undefined, 'deliveredAt timestamp set');

  // 7b. Read webhook event
  const readWebhookPayload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              statuses: [
                {
                  id: providerMsgId,
                  status: 'read',
                  timestamp: `${Math.floor(Date.now() / 1000) + 10}`,
                  recipient_id: '919876543210',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookProcessorService.processWebhook(readWebhookPayload, true);
  const readRecipient = await CampaignRecipient.findById(recipient._id);
  assert(readRecipient?.providerStatus === 'READ', 'Recipient status transitioned to READ');
  assert(readRecipient?.readAt !== undefined, 'readAt timestamp set');

  // 7c. Delayed/out-of-order 'sent' status event arriving AFTER 'read'
  const lateSentPayload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              statuses: [
                {
                  id: providerMsgId,
                  status: 'sent',
                  timestamp: `${Math.floor(Date.now() / 1000) - 10}`,
                  recipient_id: '919876543210',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookProcessorService.processWebhook(lateSentPayload, true);
  const recipientAfterLateSent = await CampaignRecipient.findById(recipient._id);
  assert(
    recipientAfterLateSent?.providerStatus === 'READ',
    'Anti-Downgrade Check: Out-of-order "sent" did NOT downgrade "READ" status'
  );

  // 8. Test Inbound Messages & Automatic Opt-Out Suppression
  console.log('\n8. Inbound Messages & Opt-Out Suppression Tests:');
  const normalInboundPayload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              contacts: [{ profile: { name: 'Priya' } }],
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.inbound_001',
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  type: 'text',
                  text: { body: 'Yes, I will attend the interview at 10 AM.' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookProcessorService.processWebhook(normalInboundPayload, true);
  const savedInbound = await WhatsAppInboundMessage.findOne({ providerMessageId: 'wamid.inbound_001' });
  assert(savedInbound !== null, 'Inbound message saved to database');
  assert(savedInbound?.textBody === 'Yes, I will attend the interview at 10 AM.', 'Inbound text matches');
  assert(savedInbound?.linkedCandidateId?.toString() === candidate._id.toString(), 'Candidate linked automatically via phone number');
  assert(savedInbound?.isOptOutRequest === false, 'Standard reply is not flagged as opt-out');

  // Test STOP Opt-Out keyword
  const optOutInboundPayload = {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.inbound_optout',
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  type: 'text',
                  text: { body: 'STOP' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookProcessorService.processWebhook(optOutInboundPayload, true);
  const optOutInbound = await WhatsAppInboundMessage.findOne({ providerMessageId: 'wamid.inbound_optout' });
  assert(optOutInbound?.isOptOutRequest === true, 'Inbound "STOP" identified as opt-out request');

  const suppressionEntry = await WhatsAppSuppression.findOne({ normalizedPhoneNumber: '+919876543210' });
  assert(suppressionEntry !== null, 'Candidate phone number automatically registered in WhatsAppSuppression list');

  const candidateAfterOptOut = await Candidate.findById(candidate._id);
  assert(candidateAfterOptOut?.whatsappConsent === false, "Candidate's whatsappConsent revoked automatically");

  // Verify suppression blocks future Cloud API dispatch
  const revalResult = await cloudCampaignSenderService.validateCampaign(campaign._id.toString());
  assert(revalResult.suppressedCount >= 1, 'Validation flags candidate in suppression list');

  // 9. Webhook Audit Log Verification
  console.log('\n9. Webhook Audit Log Verification:');
  const auditLogsCount = await WhatsAppWebhookEvent.countDocuments();
  assert(auditLogsCount >= 4, `All incoming webhook notifications logged for audit (${auditLogsCount} logged)`);

  // Clean up
  await mongoose.disconnect();
  await mongoServer.stop();

  console.log('\n=======================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('=======================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
