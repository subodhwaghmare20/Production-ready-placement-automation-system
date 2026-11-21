import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Company } from './src/models/Company.model';
import { Candidate } from './src/models/Candidate.model';
import { VirtualGroup } from './src/models/VirtualGroup.model';
import { GroupMembership } from './src/models/GroupMembership.model';
import { Campaign } from './src/models/Campaign.model';
import { CampaignRecipient } from './src/models/CampaignRecipient.model';
import { MessageTemplate } from './src/models/MessageTemplate.model';
import { WhatsAppConfig } from './src/models/WhatsAppConfig.model';
import { generateCandidateId, generateCompanyId, generateGroupId } from './src/utils/idGenerator';
import http from 'http';

const PORT = 5095;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runWhatsAppCampaignTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 STARTING MODULE 7 WHATSAPP MESSAGING ENGINE TEST SUITE');
  console.log('======================================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ WhatsApp test server running on ${BASE_URL}\n`);

    // Clean test data
    await CampaignRecipient.deleteMany({});
    await Campaign.deleteMany({});
    await MessageTemplate.deleteMany({});
    await WhatsAppConfig.deleteMany({});
    await GroupMembership.deleteMany({});
    await VirtualGroup.deleteMany({});
    await Company.deleteMany({});
    await Candidate.deleteMany({});

    // 1. Authenticate Admin
    console.log('--- TEST 1: Admin Authentication & Cookie Session ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@placement.edu',
        password: 'Admin@12345',
      }),
    });
    const loginData = (await loginRes.json()) as any;
    const rawSetCookie = loginRes.headers.get('set-cookie') || '';
    const accessTokenMatch = rawSetCookie.match(/accessToken=([^;]+)/);
    const csrfTokenMatch = rawSetCookie.match(/csrfToken=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : '';
    const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : loginData.data?.csrfToken;
    const cookieHeader = `accessToken=${accessToken}; csrfToken=${csrfToken}`;

    if (!accessToken || !csrfToken) {
      throw new Error('Failed to obtain authentication cookies');
    }
    console.log('✅ PASS: Admin authenticated with HttpOnly cookies & anti-CSRF token');

    // 2. Message Templates Auto-seeding & CRUD
    console.log('\n--- TEST 2: Message Templates Seeding & CRUD ---');
    const templatesRes = await fetch(`${BASE_URL}/message-templates`, {
      headers: { Cookie: cookieHeader },
    });
    const templatesData = (await templatesRes.json()) as any;
    if (!templatesData.success || templatesData.data.length < 8) {
      throw new Error(`Expected at least 8 predefined templates, got ${templatesData.data?.length}`);
    }
    console.log(`✅ PASS: Auto-seeded ${templatesData.data.length} standard templates`);

    // Verify predefined deletion protection
    const predefinedTemplate = templatesData.data.find((t: any) => t.isPredefined);
    const delRes = await fetch(`${BASE_URL}/message-templates/${predefinedTemplate._id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });
    const delData = (await delRes.json()) as any;
    if (delRes.status === 200 && delData.success) {
      throw new Error('Predefined template should NOT be deletable!');
    }
    console.log('✅ PASS: Predefined templates protected against deletion');

    // Create a custom template
    const createTmplRes = await fetch(`${BASE_URL}/message-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Custom Hackathon Invite',
        category: 'PLACEMENT_OPPORTUNITY',
        description: 'Invite students to national level recruitment hackathon',
        content: 'Dear {{candidateName}}, you are invited by {{companyName}} for {{jobRole}} on {{interviewDate}}!',
      }),
    });
    const createTmplData = (await createTmplRes.json()) as any;
    if (!createTmplData.success || !createTmplData.data.placeholders.includes('candidateName')) {
      throw new Error('Failed to create custom template with detected placeholders');
    }
    console.log('✅ PASS: Custom template created with auto-extracted placeholders');

    // 3. WhatsApp Connection Settings
    console.log('\n--- TEST 3: WhatsApp Settings Management & Provider Architecture ---');
    const settingsGetRes = await fetch(`${BASE_URL}/whatsapp-settings`, {
      headers: { Cookie: cookieHeader },
    });
    const settingsData = (await settingsGetRes.json()) as any;
    if (!settingsData.success || settingsData.data.mode !== 'PERSONAL_ASSISTED') {
      throw new Error('Default mode should be PERSONAL_ASSISTED');
    }
    console.log('✅ PASS: WhatsApp default mode verified as Personal WhatsApp assisted');

    // Test connection readiness
    const testConnRes = await fetch(`${BASE_URL}/whatsapp-settings/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ mode: 'PERSONAL_ASSISTED' }),
    });
    const testConnData = (await testConnRes.json()) as any;
    if (!testConnData.success) {
      throw new Error('Personal WhatsApp readiness check failed');
    }
    console.log('✅ PASS: Personal WhatsApp connection readiness confirmed');

    // 4. Seed Target Company, Virtual Group, & Candidate Cohort
    console.log('\n--- TEST 4: Recipient Auditing & WhatsApp Consent Filtering ---');
    const company = await Company.create({
      companyId: generateCompanyId(),
      companyName: 'Apex Cloud Systems',
      jobRole: 'Cloud Solutions Associate',
      requiredCandidates: 10,
      interviewDate: new Date('2026-12-05'),
      interviewLocation: 'Campus Seminar Hall A',
      workMode: 'Hybrid',
      recruitmentStatus: 'Active',
    });

    const group = await VirtualGroup.create({
      groupId: generateGroupId(),
      groupName: 'Apex Cloud Shortlisted Pool',
      companyId: company._id,
      createdBy: loginData.data.admin.id,
    });

    // Candidate 1: Full consent, valid phone -> ELIGIBLE
    const c1 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Aarav Patel',
      phoneNumber: '+91 98765 43210',
      normalizedPhoneNumber: '+919876543210',
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
      whatsappConsentSource: 'STUDENT_PORTAL',
      placementStatus: 'Available',
    });

    // Candidate 2: No consent -> EXCLUDED
    const c2 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Rhea Sen',
      phoneNumber: '+91 98765 43211',
      normalizedPhoneNumber: '+919876543211',
      whatsappConsent: false,
      placementStatus: 'Available',
    });

    // Candidate 3: Full consent, but invalid phone -> EXCLUDED
    const c3 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Kabir Verma',
      phoneNumber: '12345',
      normalizedPhoneNumber: '12345',
      whatsappConsent: true,
      placementStatus: 'Available',
    });

    // Candidate 4: Full consent, valid phone, but Inactive status -> EXCLUDED
    const c4 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Pooja Nair',
      phoneNumber: '+91 98765 43212',
      normalizedPhoneNumber: '+919876543212',
      whatsappConsent: true,
      placementStatus: 'Inactive',
    });

    // Candidate 5: Full consent, valid phone -> ELIGIBLE
    const c5 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Vikram Joshi',
      phoneNumber: '+91 98765 43213',
      normalizedPhoneNumber: '+919876543213',
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
      whatsappConsentSource: 'REGISTRATION_FORM',
      placementStatus: 'Available',
    });

    // Assign all 5 to Virtual Group
    for (const c of [c1, c2, c3, c4, c5]) {
      await GroupMembership.create({
        groupId: group._id,
        candidateId: c._id,
        membershipStatus: 'Active',
        assignedBy: loginData.data.admin.id,
      });
    }

    // 5. Preview Audience Readiness
    const previewRes = await fetch(`${BASE_URL}/campaigns/preview-audience/${group._id}`, {
      headers: { Cookie: cookieHeader },
    });
    const previewData = (await previewRes.json()) as any;
    if (
      !previewData.success ||
      previewData.data.totalMembers !== 5 ||
      previewData.data.eligibleCount !== 2 ||
      previewData.data.unconsentedCount !== 1
    ) {
      throw new Error(`Audience preview mismatch: ${JSON.stringify(previewData.data)}`);
    }
    console.log('✅ PASS: Audience readiness accurately computed (2 eligible, 1 no consent, 1 invalid phone, 1 inactive)');

    // 6. Create & Prepare Campaign
    console.log('\n--- TEST 5: Campaign Preparation, Merge Tags & wa.me Links ---');
    const createCampRes = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Apex Cloud Recruitment Outreach',
        companyId: company._id.toString(),
        groupId: group._id.toString(),
        messageContent:
          'Dear {{candidateName}}, congratulations! You are shortlisted for {{companyName}} ({{jobRole}}). Date: {{interviewDate}}, Venue: {{interviewLocation}}.',
        metadata: {
          interviewDate: '2026-12-05',
          interviewTime: '10:00 AM',
          interviewLocation: 'Campus Seminar Hall A',
          customJobRole: 'Cloud Solutions Associate',
        },
      }),
    });
    const createCampData = (await createCampRes.json()) as any;
    if (!createCampData.success || createCampData.data.eligibleRecipients.length !== 2) {
      throw new Error(`Campaign creation failed: ${JSON.stringify(createCampData)}`);
    }

    const campaign = createCampData.data.campaign;
    const recipients = createCampData.data.eligibleRecipients;

    // Verify personalization on Candidate 1
    const r1 = recipients.find((r: any) => r.candidateName === 'Aarav Patel');
    if (!r1 || !r1.personalizedMessage.includes('Aarav Patel') || !r1.personalizedMessage.includes('Apex Cloud Systems')) {
      throw new Error('Message personalization failed for Aarav Patel');
    }

    // Verify click-to-chat URL format: https://wa.me/919876543210?text=...
    if (!r1.clickToChatUrl.startsWith('https://wa.me/919876543210?text=')) {
      throw new Error(`Invalid click-to-chat URL: ${r1.clickToChatUrl}`);
    }
    console.log('✅ PASS: Dynamic placeholders interpolated and official wa.me link constructed');

    // 7. Sequential Assisted Sending Workflow
    console.log('\n--- TEST 6: Sequential Assisted Sender Runner Workflow ---');
    // Fetch Next
    const next1Res = await fetch(`${BASE_URL}/campaigns/${campaign._id}/next`, {
      headers: { Cookie: cookieHeader },
    });
    const next1Data = (await next1Res.json()) as any;
    if (!next1Data.success || next1Data.data.recipient.candidateName !== 'Aarav Patel') {
      throw new Error('Expected first recipient to be Aarav Patel');
    }

    // Trigger Chat Opened
    const openChatRes = await fetch(
      `${BASE_URL}/campaigns/${campaign._id}/recipients/${next1Data.data.recipient._id}/open-chat`,
      {
        method: 'POST',
        headers: {
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
      }
    );
    const openChatData = (await openChatRes.json()) as any;
    if (!openChatData.success || openChatData.data.status !== 'CHAT_OPENED') {
      throw new Error('Status transition to CHAT_OPENED failed');
    }
    console.log('✅ PASS: Chat opened recorded, transitioning status to CHAT_OPENED');

    // Confirm Manual Send
    const confirmRes = await fetch(
      `${BASE_URL}/campaigns/${campaign._id}/recipients/${next1Data.data.recipient._id}/confirm-sent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ notes: 'Dispatched manually on WhatsApp Web' }),
      }
    );
    const confirmData = (await confirmRes.json()) as any;
    if (!confirmData.success || confirmData.data.recipient.status !== 'SENT_MANUALLY_CONFIRMED') {
      throw new Error('Status transition to SENT_MANUALLY_CONFIRMED failed');
    }
    console.log('✅ PASS: Manual dispatch confirmed (SENT_MANUALLY_CONFIRMED), queue advanced');

    // Fetch Next (Should be Candidate 5: Vikram Joshi)
    const next2Res = await fetch(`${BASE_URL}/campaigns/${campaign._id}/next`, {
      headers: { Cookie: cookieHeader },
    });
    const next2Data = (await next2Res.json()) as any;
    if (!next2Data.success || next2Data.data.recipient.candidateName !== 'Vikram Joshi') {
      throw new Error('Expected second recipient to be Vikram Joshi');
    }

    // Skip Candidate 5
    const skipRes = await fetch(
      `${BASE_URL}/campaigns/${campaign._id}/recipients/${next2Data.data.recipient._id}/skip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ skipReason: 'Candidate requested postponement' }),
      }
    );
    const skipData = (await skipRes.json()) as any;
    if (!skipData.success || skipData.data.recipient.status !== 'SKIPPED') {
      throw new Error('Recipient skip failed');
    }
    if (!skipData.data.isCompleted) {
      throw new Error('Campaign should be marked completed after last candidate');
    }
    console.log('✅ PASS: Recipient skipped with audit reason, campaign automatically COMPLETED');

    // 8. Progress Persistence Check
    console.log('\n--- TEST 7: Progress Persistence & Completed State ---');
    const finalCampRes = await fetch(`${BASE_URL}/campaigns/${campaign._id}`, {
      headers: { Cookie: cookieHeader },
    });
    const finalCampData = (await finalCampRes.json()) as any;
    if (
      finalCampData.data.status !== 'COMPLETED' ||
      finalCampData.data.metrics.manuallyConfirmedCount !== 1 ||
      finalCampData.data.metrics.skippedCount !== 1
    ) {
      throw new Error('Campaign completion state or metrics mismatch');
    }
    console.log('✅ PASS: Campaign status and audit metrics persisted in MongoDB');

    // 9. Dashboard Statistics Aggregation
    console.log('\n--- TEST 8: WhatsApp & Main Dashboard Aggregation ---');
    const statsRes = await fetch(`${BASE_URL}/campaigns/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const statsData = (await statsRes.json()) as any;
    if (
      !statsData.success ||
      statsData.data.totalCampaigns < 1 ||
      statsData.data.messagesManuallyConfirmed < 1 ||
      statsData.data.completedCampaigns < 1
    ) {
      throw new Error(`Stats aggregation incorrect: ${JSON.stringify(statsData.data)}`);
    }

    // Verify main admin dashboard stats include campaign confirmed messages
    const mainDashRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const mainDashData = (await mainDashRes.json()) as any;
    if (!mainDashData.success || mainDashData.data.messagesSent < 1) {
      throw new Error('Main dashboard stats failed to count confirmed WhatsApp messages');
    }
    console.log(`✅ PASS: Main dashboard reflects real messagesSent = ${mainDashData.data.messagesSent}`);

    // 10. Security Checks (CSRF & Auth)
    console.log('\n--- TEST 9: Security Checks (CSRF & Authentication Protection) ---');
    const noCsrfRes = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `accessToken=${accessToken}`, // No CSRF token
      },
      body: JSON.stringify({ name: 'Tampered Campaign' }),
    });
    if (noCsrfRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden without CSRF, got ${noCsrfRes.status}`);
    }

    const noAuthRes = await fetch(`${BASE_URL}/campaigns`);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized without auth cookies, got ${noAuthRes.status}`);
    }
    console.log('✅ PASS: Anti-CSRF protection and authentication strictly enforced');

    console.log('\n======================================================');
    console.log('🎉 ALL MODULE 7 WHATSAPP ENGINE TESTS PASSED (10/10)');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ MODULE 7 TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server!) server.close();
    await disconnectDatabase();
  }
}

runWhatsAppCampaignTestSuite();
