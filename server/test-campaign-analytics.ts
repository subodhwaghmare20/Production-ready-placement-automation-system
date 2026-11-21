import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Company } from './src/models/Company.model';
import { Candidate } from './src/models/Candidate.model';
import { VirtualGroup } from './src/models/VirtualGroup.model';
import { GroupMembership } from './src/models/GroupMembership.model';
import { Campaign } from './src/models/Campaign.model';
import { CampaignRecipient } from './src/models/CampaignRecipient.model';
import { CampaignActivity } from './src/models/CampaignActivity.model';
import { MessageTemplate } from './src/models/MessageTemplate.model';
import { campaignService } from './src/services/campaign.service';
import { activityService } from './src/services/activity.service';
import {
  generateCandidateId,
  generateCompanyId,
  generateGroupId,
  generateTemplateId,
} from './src/utils/idGenerator';
import http from 'http';

const PORT = 5097;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runCampaignAnalyticsTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 STARTING MODULE 9: CAMPAIGN TRACKING, ANALYTICS & REPORTS SUITE');
  console.log('================================================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Module 9 test server running on ${BASE_URL}\n`);

    // Clean test data
    await CampaignActivity.deleteMany({});
    await CampaignRecipient.deleteMany({});
    await Campaign.deleteMany({});
    await GroupMembership.deleteMany({});
    await VirtualGroup.deleteMany({});
    await Company.deleteMany({});
    await Candidate.deleteMany({});

    // 1. Authenticate Admin
    console.log('--- TEST 1: Admin Authentication & Session ---');
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

    if (!accessToken) throw new Error('Admin login failed: No access token');
    console.log('✓ Admin authenticated successfully\n');

    // Seed Company, Group, Candidates
    console.log('--- TEST 2: Seed Test Drive Data & Candidates ---');
    const company = await Company.create({
      companyId: generateCompanyId(),
      companyName: 'Analytics Dynamics Corp',
      industry: 'Data & Analytics',
      jobRole: 'Data Engineer',
      salaryPackage: '12 LPA',
      jobLocation: 'Bengaluru',
      workMode: 'Hybrid',
      requiredCandidates: 10,
    });

    const company2 = await Company.create({
      companyId: generateCompanyId(),
      companyName: 'CloudScale Systems',
      industry: 'Cloud Infrastructure',
      jobRole: 'DevOps Engineer',
      salaryPackage: '14 LPA',
      jobLocation: 'Hyderabad',
      workMode: 'Office',
      requiredCandidates: 5,
    });

    const group = await VirtualGroup.create({
      groupId: generateGroupId(),
      groupName: 'Analytics Dynamics - 2026 Batch',
      companyId: company._id,
      memberCount: 3,
      status: 'Active',
      createdBy: loginData.data?.admin?.id,
    });

    const c1 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Aarav Patel',
      phoneNumber: '9876543210',
      normalizedPhoneNumber: '+919876543210',
      email: 'aarav.patel@test.edu',
      collegeName: 'Tech Institute',
      degree: 'B.Tech',
      branch: 'Computer Science',
      passingYear: 2026,
      skills: ['Python', 'SQL', 'Spark'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
    });

    const c2 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Diya Sharma',
      phoneNumber: '9123456789',
      normalizedPhoneNumber: '+919123456789',
      email: 'diya.sharma@test.edu',
      collegeName: 'Tech Institute',
      degree: 'B.Tech',
      branch: 'Information Technology',
      passingYear: 2026,
      skills: ['React', 'Node.js', 'MongoDB'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
    });

    const c3 = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Rohan Gupta',
      phoneNumber: '9988776655',
      normalizedPhoneNumber: '+919988776655',
      email: 'rohan.gupta@test.edu',
      collegeName: 'Tech Institute',
      degree: 'B.Tech',
      branch: 'Data Science',
      passingYear: 2026,
      skills: ['Python', 'TensorFlow', 'PostgreSQL'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
    });

    await GroupMembership.create([
      { groupId: group._id, candidateId: c1._id, assignedBy: loginData.data?.admin?.id },
      { groupId: group._id, candidateId: c2._id, assignedBy: loginData.data?.admin?.id },
      { groupId: group._id, candidateId: c3._id, assignedBy: loginData.data?.admin?.id },
    ]);
    console.log('✓ Test drive and 3 consented candidates seeded\n');

    // 3. Create Campaign and Verify Lifecycle Activity Logging
    console.log('--- TEST 3: Campaign Preparation & Initial Activity Logging ---');
    const template = await MessageTemplate.create({
      templateId: generateTemplateId(),
      name: 'Analytics Interview Invite',
      category: 'INTERVIEW_INVITATION',
      content: 'Dear {{candidateFirstName}}, your interview for {{jobRole}} at {{companyName}} is scheduled for {{interviewDate}}.',
      placeholders: ['candidateFirstName', 'jobRole', 'companyName', 'interviewDate'],
      status: 'Active',
      language: 'English',
      createdBy: loginData.data?.admin?.id,
    });

    const createCampRes = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Analytics Dynamics - Wave 1',
        companyId: company._id.toString(),
        groupId: group._id.toString(),
        templateId: template._id.toString(),
        messageContent: template.content,
        metadata: {
          interviewDate: '25th Nov 2026',
          interviewTime: '10:00 AM',
          adminName: 'Placement Office',
        },
      }),
    });

    const createCampData = (await createCampRes.json()) as any;
    if (!createCampData.success) throw new Error(`Campaign creation failed: ${createCampData.message}`);

    const campaignId = createCampData.data?.campaign?._id;
    const campRecipients = createCampData.data?.eligibleRecipients || [];
    console.log(`✓ Campaign created: ${createCampData.data?.campaign?.campaignId} with ${campRecipients.length} recipients`);

    // Verify CampaignActivity records were logged
    const activities = await CampaignActivity.find({ campaignId }).sort({ timestamp: 1 });
    const eventTypes = activities.map((a) => a.eventType);
    console.log('  Logged activity event types:', eventTypes);
    if (!eventTypes.includes('CAMPAIGN_CREATED') || !eventTypes.includes('RECIPIENTS_PREPARED')) {
      throw new Error('Expected CAMPAIGN_CREATED and RECIPIENTS_PREPARED activity events');
    }
    console.log('✓ Campaign lifecycle activities logged successfully\n');

    // 4. Test Assisted Send Actions & Retries Tracking
    console.log('--- TEST 4: Recipient Actions, Retries & Attempt History ---');
    const r1 = campRecipients[0];
    const r2 = campRecipients[1];
    const r3 = campRecipients[2];

    // Open chat for r1
    await fetch(`${BASE_URL}/campaigns/${campaignId}/recipients/${r1._id}/open-chat`, {
      method: 'POST',
      headers: { Cookie: cookieHeader, 'X-CSRF-Token': csrfToken },
    });

    // Confirm manual send for r1
    await fetch(`${BASE_URL}/campaigns/${campaignId}/recipients/${r1._id}/confirm-sent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ notes: 'Confirmed sent via WhatsApp Web' }),
    });

    // Skip r2
    await fetch(`${BASE_URL}/campaigns/${campaignId}/recipients/${r2._id}/skip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ skipReason: 'Candidate requested evening slot' }),
    });

    // Mark chat failed for r3
    await fetch(`${BASE_URL}/campaigns/${campaignId}/recipients/${r3._id}/mark-failed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ errorDetails: 'WhatsApp desktop client unresponsive' }),
    });

    // Verify r3 status is FAILED_TO_OPEN with attempt history
    const failedRecipient = await CampaignRecipient.findById(r3._id);
    if (failedRecipient?.status !== 'FAILED_TO_OPEN') {
      throw new Error(`Expected r3 status FAILED_TO_OPEN, got ${failedRecipient?.status}`);
    }
    if (!failedRecipient.attemptHistory || failedRecipient.attemptHistory.length === 0) {
      throw new Error('Expected r3 attemptHistory to contain failed attempt record');
    }
    console.log('✓ Recorded chat opening failure with error details and attempt history');

    // Retry r3
    await fetch(`${BASE_URL}/campaigns/${campaignId}/recipients/${r3._id}/retry`, {
      method: 'POST',
      headers: { Cookie: cookieHeader, 'X-CSRF-Token': csrfToken },
    });

    const retriedRecipient = await CampaignRecipient.findById(r3._id);
    if (retriedRecipient?.status !== 'READY') {
      throw new Error(`Expected r3 status reset to READY on retry, got ${retriedRecipient?.status}`);
    }
    if (retriedRecipient.attemptHistory.length < 2) {
      throw new Error('Expected r3 attemptHistory to preserve historical attempts');
    }
    console.log(`✓ Recipient retried successfully: ${retriedRecipient.attemptHistory.length} attempts preserved in history\n`);

    // 5. Test Duplicate Activity Event Prevention
    console.log('--- TEST 5: Duplicate Activity Event Prevention within 3s ---');
    const initialActivityCount = await CampaignActivity.countDocuments({ campaignId });
    // Attempt to log exact same event consecutively
    await activityService.logActivity({
      campaignId,
      eventType: 'CAMPAIGN_PAUSED',
      description: 'Testing duplicate deduplication',
    });
    const countAfterFirst = await CampaignActivity.countDocuments({ campaignId });
    // Second immediate identical call
    await activityService.logActivity({
      campaignId,
      eventType: 'CAMPAIGN_PAUSED',
      description: 'Testing duplicate deduplication',
    });
    const countAfterSecond = await CampaignActivity.countDocuments({ campaignId });

    if (countAfterSecond !== countAfterFirst) {
      throw new Error('Duplicate activity event was not prevented within 3s threshold');
    }
    console.log('✓ Duplicate activity event deduplication verified successfully\n');

    // 6. Test Campaign Analytics Overview API
    console.log('--- TEST 6: GET /api/analytics/overview ---');
    const overviewRes = await fetch(`${BASE_URL}/analytics/overview`, {
      headers: { Cookie: cookieHeader },
    });
    const overviewData = (await overviewRes.json()) as any;
    if (!overviewData.success) throw new Error('Overview API returned success=false');

    const stats = overviewData.data;
    console.log('  Overview stats returned:', {
      totalCampaigns: stats.totalCampaigns,
      totalRecipients: stats.totalRecipients,
      messagesManuallyConfirmed: stats.messagesManuallyConfirmed,
      messagesSkipped: stats.messagesSkipped,
      mode: stats.mode,
    });

    if (stats.totalCampaigns < 1) throw new Error('Expected at least 1 campaign in overview');
    if (stats.messagesManuallyConfirmed !== 1) {
      throw new Error(`Expected 1 confirmed send, got ${stats.messagesManuallyConfirmed}`);
    }
    if (!stats.disclaimer || !stats.disclaimer.includes('personal assisted mode')) {
      throw new Error('Expected personal assisted mode disclaimer in overview stats');
    }
    console.log('✓ Analytics overview reflects accurate DB records with personal mode disclaimer\n');

    // 7. Test Campaign Trends & Recipient Distribution APIs
    console.log('--- TEST 7: GET /api/analytics/campaign-trends & recipient-status ---');
    const trendsRes = await fetch(`${BASE_URL}/analytics/campaign-trends`, {
      headers: { Cookie: cookieHeader },
    });
    const trendsData = (await trendsRes.json()) as any;
    if (!trendsData.success || !Array.isArray(trendsData.data)) {
      throw new Error('Expected trends data array');
    }
    console.log(`✓ Campaign trends returned ${trendsData.data.length} periods`);

    const distRes = await fetch(`${BASE_URL}/analytics/recipient-status`, {
      headers: { Cookie: cookieHeader },
    });
    const distData = (await distRes.json()) as any;
    if (!distData.success || distData.data?.sentManuallyConfirmed !== 1) {
      throw new Error('Recipient status distribution failed');
    }
    console.log('✓ Recipient status distribution verified successfully\n');

    // 8. Test Campaign Comparison API
    console.log('--- TEST 8: GET /api/analytics/campaigns/compare ---');
    // Create second campaign for comparison
    const group2 = await VirtualGroup.create({
      groupId: generateGroupId(),
      groupName: 'CloudScale - 2026 Batch',
      companyId: company2._id,
      memberCount: 2,
      status: 'Active',
      createdBy: loginData.data?.admin?.id,
    });
    await GroupMembership.create([
      { groupId: group2._id, candidateId: c1._id, assignedBy: loginData.data?.admin?.id },
      { groupId: group2._id, candidateId: c2._id, assignedBy: loginData.data?.admin?.id },
    ]);

    const camp2Res = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'CloudScale DevOps Wave',
        companyId: company2._id.toString(),
        groupId: group2._id.toString(),
        messageContent: 'Dear {{candidateFirstName}}, CloudScale interview invitation.',
      }),
    });
    const camp2Data = (await camp2Res.json()) as any;
    const campaign2Id = camp2Data.data?.campaign?._id;

    const compareRes = await fetch(
      `${BASE_URL}/analytics/campaigns/compare?ids=${campaignId},${campaign2Id}`,
      { headers: { Cookie: cookieHeader } }
    );
    const compareData = (await compareRes.json()) as any;
    if (!compareData.success || compareData.comparisons?.length !== 2) {
      throw new Error('Campaign comparison failed to return 2 campaigns');
    }
    if (!compareData.disclaimer || !compareData.disclaimer.includes('Delivery and read status cannot be independently verified')) {
      throw new Error('Expected disclaimer stating personal WhatsApp mode does not compare delivery rates');
    }
    console.log('✓ Side-by-side campaign comparison verified with personal mode notice\n');

    // 9. Test Recipient Tracking & Phone Number Masking / Unmasking
    console.log('--- TEST 9: Recipient Tracking & Phone Masking ---');
    // Default: masked
    const maskedRes = await fetch(`${BASE_URL}/analytics/recipients`, {
      headers: { Cookie: cookieHeader },
    });
    const maskedData = (await maskedRes.json()) as any;
    const maskedPhone = maskedData.recipients[0]?.displayPhoneNumber;
    console.log('  Masked phone sample:', maskedPhone);
    if (!maskedPhone.includes('***') && !maskedPhone.includes('••')) {
      throw new Error(`Expected masked phone number, got: ${maskedPhone}`);
    }

    // Authorized reveal: unmaskPhone=true
    const unmaskRes = await fetch(`${BASE_URL}/analytics/recipients?unmaskPhone=true`, {
      headers: { Cookie: cookieHeader },
    });
    const unmaskData = (await unmaskRes.json()) as any;
    const rawPhone = unmaskData.recipients[0]?.displayPhoneNumber;
    console.log('  Unmasked phone sample:', rawPhone);
    if (rawPhone.includes('***')) {
      throw new Error(`Expected full unmasked phone number, got: ${rawPhone}`);
    }
    console.log('✓ Phone number masking and authorized unmasking verified\n');

    // 10. Test Report Generation in All 3 Formats (XLSX, CSV, PDF)
    console.log('--- TEST 10: Report Downloads (Excel, CSV, PDF) ---');
    // A. Campaign Summary - Excel
    const xlsxRes = await fetch(`${BASE_URL}/reports/campaign-summary?format=xlsx`, {
      headers: { Cookie: cookieHeader },
    });
    if (xlsxRes.status !== 200 || !xlsxRes.headers.get('content-type')?.includes('spreadsheetml')) {
      throw new Error(`Expected XLSX download, got status ${xlsxRes.status}`);
    }
    const xlsxBuffer = await xlsxRes.arrayBuffer();
    if (xlsxBuffer.byteLength < 500) throw new Error('XLSX buffer too small');
    console.log(`✓ Campaign Summary XLSX generated: ${xlsxBuffer.byteLength} bytes`);

    // B. Campaign Summary - CSV
    const csvRes = await fetch(`${BASE_URL}/reports/campaign-summary?format=csv`, {
      headers: { Cookie: cookieHeader },
    });
    const csvText = await csvRes.text();
    if (!csvText.includes('Campaign Name') || !csvText.includes('Analytics Dynamics - Wave 1')) {
      throw new Error('CSV report content missing expected header/campaign');
    }
    console.log(`✓ Campaign Summary CSV generated: ${csvText.length} characters`);

    // C. Campaign Summary - PDF
    const pdfRes = await fetch(`${BASE_URL}/reports/campaign-summary?format=pdf`, {
      headers: { Cookie: cookieHeader },
    });
    if (pdfRes.status !== 200 || !pdfRes.headers.get('content-type')?.includes('application/pdf')) {
      throw new Error(`Expected PDF download, got status ${pdfRes.status}`);
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const pdfHeader = pdfBuffer.slice(0, 8).toString('latin1');
    if (!pdfHeader.startsWith('%PDF-1.4')) {
      throw new Error(`Invalid PDF header: ${pdfHeader}`);
    }
    console.log(`✓ Campaign Summary PDF generated: ${pdfBuffer.byteLength} bytes (Valid %PDF-1.4 header)`);

    // D. Recipient Details - PDF
    const recPdfRes = await fetch(`${BASE_URL}/reports/recipient-details?format=pdf`, {
      headers: { Cookie: cookieHeader },
    });
    const recPdfBuf = Buffer.from(await recPdfRes.arrayBuffer());
    if (!recPdfBuf.slice(0, 8).toString('latin1').startsWith('%PDF-1.4')) {
      throw new Error('Invalid Recipient Details PDF header');
    }
    console.log(`✓ Recipient Details PDF generated: ${recPdfBuf.byteLength} bytes`);

    // E. Company Performance & Monthly Activity & Failed/Skipped Reports
    const compXlsx = await fetch(`${BASE_URL}/reports/company-performance?format=xlsx`, {
      headers: { Cookie: cookieHeader },
    });
    if (compXlsx.status !== 200) throw new Error('Company performance XLSX failed');

    const monthCsv = await fetch(`${BASE_URL}/reports/monthly-activity?format=csv`, {
      headers: { Cookie: cookieHeader },
    });
    if (monthCsv.status !== 200) throw new Error('Monthly activity CSV failed');

    const failedPdf = await fetch(`${BASE_URL}/reports/failed-skipped?format=pdf`, {
      headers: { Cookie: cookieHeader },
    });
    if (failedPdf.status !== 200) throw new Error('Failed/Skipped PDF failed');

    console.log('✓ All 5 Report types successfully verified across XLSX, CSV, and PDF formats\n');

    // 11. Test Section 9: Future WhatsApp Cloud API Webhook Compatibility
    console.log('--- TEST 11: Future WhatsApp Cloud API Webhook Compatibility ---');
    const testRecipient = await CampaignRecipient.findById(r1._id);
    if (!testRecipient) throw new Error('Recipient not found');

    testRecipient.providerMessageId = 'wamid.HBgLMOTE5ODc2NTQzMjEwFQIAERgSRjQ2Q';
    await testRecipient.save();

    // 1st webhook event: DELIVERED
    const webhookRes = await campaignService.recordProviderWebhookEvent(
      testRecipient.providerMessageId,
      'DELIVERED',
      new Date(),
      { timestamp: 1732185600, recipient_id: '919876543210' }
    );
    if (webhookRes?.providerStatus !== 'DELIVERED') {
      throw new Error(`Expected providerStatus DELIVERED, got ${webhookRes?.providerStatus}`);
    }
    if (webhookRes?.providerWebhookEvents?.length !== 1) {
      throw new Error('Expected 1 provider webhook event recorded');
    }

    // Duplicate webhook event: verify idempotency
    const dupRes = await campaignService.recordProviderWebhookEvent(
      testRecipient.providerMessageId,
      'DELIVERED',
      new Date(),
      { timestamp: 1732185600, recipient_id: '919876543210' }
    );
    if (dupRes?.providerWebhookEvents?.length !== 1) {
      throw new Error('Duplicate webhook event was not handled idempotently');
    }

    // Verify personal mode recipient status and metrics were NOT touched
    const refreshedR1 = await CampaignRecipient.findById(r1._id);
    if (refreshedR1?.status !== 'SENT_MANUALLY_CONFIRMED') {
      throw new Error('Personal assisted mode status was corrupted by provider webhook event');
    }
    console.log('✓ Future WhatsApp Cloud API webhook handler handles events idempotently and strictly separates provider metrics\n');

    console.log('================================================================');
    console.log('🎉 ALL 11 TEST SUITES IN MODULE 9 COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ MODULE 9 TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server!) {
      server.close();
    }
    await disconnectDatabase();
  }
}

runCampaignAnalyticsTestSuite();
