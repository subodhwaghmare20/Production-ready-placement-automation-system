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
import { generateCandidateId, generateCompanyId, generateGroupId } from './src/utils/idGenerator';
import http from 'http';

const PORT = 5096;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runAdvancedTemplatesTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 STARTING MODULE 8: ADVANCED TEMPLATES & PERSONALIZATION SUITE');
  console.log('================================================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Module 8 test server running on ${BASE_URL}\n`);

    // Clean test data
    await CampaignRecipient.deleteMany({});
    await Campaign.deleteMany({});
    await MessageTemplate.deleteMany({ isPredefined: false });
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
      throw new Error('Failed to obtain authentication session');
    }
    console.log('✅ PASS: Admin authenticated with HttpOnly cookies & anti-CSRF token');

    // 2. Placeholder Dictionary & Validation Endpoint
    console.log('\n--- TEST 2: Placeholder System & Syntax Validation ---');
    const placeholdersRes = await fetch(`${BASE_URL}/templates/placeholders`, {
      headers: { Cookie: cookieHeader },
    });
    const placeholdersData = (await placeholdersRes.json()) as any;
    if (!placeholdersData.success || placeholdersData.data.length < 20) {
      throw new Error(`Expected at least 20 supported placeholders, got ${placeholdersData.data?.length}`);
    }
    console.log(`✅ PASS: Loaded ${placeholdersData.data.length} supported placeholders across 4 categories`);

    // Test syntax validation with valid and invalid tags
    const valRes = await fetch(`${BASE_URL}/templates/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        content: 'Hello {{candidateFirstName}}, welcome to {{companyName}}! Role: {{jobRole}}. Invalid: {{studnt_mobile}} & {{fake_tag}}.',
      }),
    });
    const valData = (await valRes.json()) as any;
    if (
      !valData.success ||
      valData.data.isClean ||
      valData.data.invalidPlaceholders.length !== 2 ||
      !valData.data.validPlaceholders.includes('candidateFirstName')
    ) {
      throw new Error(`Validation failed: ${JSON.stringify(valData)}`);
    }
    console.log('✅ PASS: Detected valid merge tags and correctly flagged misspelled/unsupported tags');

    // 3. Advanced Template Creation, Duplication & Protection
    console.log('\n--- TEST 3: Advanced Template Management & Duplication ---');
    const createTmplRes = await fetch(`${BASE_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Technical Assessment Invite V2',
        subject: 'Coding Assessment Round Details',
        category: 'JOB_OPPORTUNITY',
        description: 'Sent to students shortlisted for coding rounds',
        language: 'English',
        content:
          'Hello {{candidateFirstName}},\n\nYour technical assessment for {{companyName}} ({{jobRole}}) is scheduled on {{interviewDate}} at {{interviewTime}}.\nVenue/Mode: {{interviewLocation}}.\n\nPackage: {{salaryPackage}}\nSkills evaluated: {{skills}}\n\nRegards,\n{{adminName}}',
        status: 'Active',
      }),
    });
    const createTmplData = (await createTmplRes.json()) as any;
    if (!createTmplData.success || !createTmplData.data.placeholders.includes('candidateFirstName')) {
      throw new Error(`Template creation failed: ${JSON.stringify(createTmplData)}`);
    }
    const templateId = createTmplData.data._id;
    console.log('✅ PASS: Advanced template created with language, subject, and auto-extracted placeholders');

    // Duplicate template
    const dupRes = await fetch(`${BASE_URL}/templates/${templateId}/duplicate`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });
    const dupData = (await dupRes.json()) as any;
    if (!dupData.success || !dupData.data.name.startsWith('Copy of ')) {
      throw new Error('Template duplication failed');
    }
    console.log(`✅ PASS: Duplicated template as '${dupData.data.name}' with new templateId`);

    // 4. Template Export & Import
    console.log('\n--- TEST 4: Template Export & Import with Validation ---');
    const exportRes = await fetch(`${BASE_URL}/templates/export`, {
      headers: { Cookie: cookieHeader },
    });
    const exportData = (await exportRes.json()) as any;
    if (!exportData.success || !Array.isArray(exportData.data.templates)) {
      throw new Error('Template export failed');
    }
    console.log(`✅ PASS: Exported ${exportData.data.count} templates in JSON format`);

    // Test import
    const importPayload = [
      {
        name: 'Imported Hackathon Invitation',
        subject: 'Annual Coding Hackathon',
        category: 'JOB_OPPORTUNITY',
        language: 'English',
        content: 'Dear {{candidateName}}, join {{companyName}} hackathon on {{interviewDate}}!',
      },
    ];
    const importRes = await fetch(`${BASE_URL}/templates/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ templates: importPayload, overwrite: false }),
    });
    const importData = (await importRes.json()) as any;
    if (!importData.success || importData.data.importedCount < 1) {
      throw new Error(`Template import failed: ${JSON.stringify(importData)}`);
    }
    console.log('✅ PASS: Successfully imported templates with duplicate check');

    // 5. Seed Company & Candidates (Candidate A: Full data, Candidate B: Missing fields)
    console.log('\n--- TEST 5: Candidate-Specific Personalization & Missing Data Detection ---');
    const company = await Company.create({
      companyId: generateCompanyId(),
      companyName: 'Nova Software Technologies',
      industry: 'Enterprise Software',
      jobRole: 'Software Engineer',
      salaryPackage: '7.5 LPA',
      jobLocation: 'Hyderabad',
      workMode: 'Hybrid',
      requiredCandidates: 5,
      interviewDate: new Date('2026-12-10'),
      interviewLocation: 'Auditorium Hall B',
      interviewMode: 'Offline',
      recruitmentStatus: 'Active',
    });

    const group = await VirtualGroup.create({
      groupId: generateGroupId(),
      groupName: 'Nova Software Shortlisted Cohort',
      companyId: company._id,
      createdBy: loginData.data.admin.id,
    });

    // Candidate A: Full complete data
    const candA = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Rahul Sharma',
      phoneNumber: '+91 98765 43210',
      normalizedPhoneNumber: '+919876543210',
      email: 'rahul.sharma@college.edu',
      collegeName: 'National Institute of Tech',
      degree: 'B.Tech',
      branch: 'Computer Science',
      passingYear: 2026,
      skills: ['React', 'Node.js', 'MongoDB'],
      whatsappConsent: true,
      placementStatus: 'Available',
    });

    // Candidate B: Missing email and skills
    const candB = await Candidate.create({
      candidateId: generateCandidateId(),
      fullName: 'Priya Patel',
      phoneNumber: '+91 98765 43211',
      normalizedPhoneNumber: '+919876543211',
      collegeName: 'National Institute of Tech',
      degree: 'MCA',
      branch: 'Information Tech',
      whatsappConsent: true,
      placementStatus: 'Available',
    });

    for (const c of [candA, candB]) {
      await GroupMembership.create({
        groupId: group._id,
        candidateId: c._id,
        membershipStatus: 'Active',
        assignedBy: loginData.data.admin.id,
      });
    }

    // Prepare Campaign
    const prepRes = await fetch(`${BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Nova Software Placement Drive',
        companyId: company._id.toString(),
        groupId: group._id.toString(),
        templateId: templateId.toString(),
        messageContent:
          'Hello {{candidateFirstName}},\n\nYour technical interview for {{companyName}} ({{jobRole}}) in {{jobLocation}} is on {{interviewDate}} at {{interviewTime}}.\nPackage: {{salaryPackage}}\nSkills: {{skills}}\n\nRegards,\n{{adminName}}',
        metadata: {
          interviewDate: '2026-12-10',
          interviewTime: '11:00 AM',
          customJobRole: 'Software Engineer',
          adminName: 'Prof. David',
        },
      }),
    });
    const prepData = (await prepRes.json()) as any;
    if (!prepData.success || prepData.data.eligibleRecipients.length !== 2) {
      throw new Error(`Campaign prep failed: ${JSON.stringify(prepData)}`);
    }

    const campaign = prepData.data.campaign;
    const recs = prepData.data.eligibleRecipients;

    const rA = recs.find((r: any) => r.candidateName === 'Rahul Sharma');
    const rB = recs.find((r: any) => r.candidateName === 'Priya Patel');

    // Verify first name extraction: Rahul
    if (!rA.personalizedMessage.includes('Hello Rahul') || !rA.personalizedMessage.includes('React, Node.js, MongoDB')) {
      throw new Error(`Candidate A personalization failed: ${rA.personalizedMessage}`);
    }
    if (rA.personalizationStatus !== 'VALID') {
      throw new Error(`Expected Candidate A status VALID, got ${rA.personalizationStatus}`);
    }

    // Verify Candidate B detected missing skills
    if (!rB.personalizedMessage.includes('Hello Priya') || !rB.missingFields.includes('skills')) {
      throw new Error(`Candidate B missing fields detection failed: ${JSON.stringify(rB)}`);
    }
    if (rB.personalizationStatus !== 'WARNING_MISSING_DATA') {
      throw new Error(`Expected Candidate B status WARNING_MISSING_DATA, got ${rB.personalizationStatus}`);
    }
    console.log('✅ PASS: First names extracted, skills joined, and missing fields detected without inventing fake data');

    // 6. Campaign Validation Summary
    console.log('\n--- TEST 6: Campaign Bulk Validation Summary API ---');
    const sumRes = await fetch(`${BASE_URL}/campaigns/${campaign._id}/validation-summary`, {
      headers: { Cookie: cookieHeader },
    });
    const sumData = (await sumRes.json()) as any;
    if (
      !sumData.success ||
      sumData.data.totalRecipients !== 2 ||
      sumData.data.validCount !== 1 ||
      sumData.data.warningCount !== 1 ||
      sumData.data.missingFieldFrequency.skills !== 1
    ) {
      throw new Error(`Validation summary mismatch: ${JSON.stringify(sumData.data)}`);
    }
    console.log('✅ PASS: Validation summary computes exact counts of valid, warnings, and missing field frequency');

    // 7. Candidate-Level Message Editing (Override only this recipient)
    console.log('\n--- TEST 7: Candidate-Level Override (Template Unchanged) ---');
    const originalTemplateBefore = await MessageTemplate.findById(templateId);
    const customMessageForPriya =
      'Hello Priya,\n\nSpecial update: Your technical interview for Nova Software Technologies (Software Engineer) in Hyderabad is confirmed on 2026-12-10 at 11:00 AM.\nPackage: 7.5 LPA\n\nBest wishes,\nProf. David';

    const editRes = await fetch(
      `${BASE_URL}/campaigns/${campaign._id}/recipients/${rB._id}/message`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ message: customMessageForPriya }),
      }
    );
    const editData = (await editRes.json()) as any;
    if (
      !editData.success ||
      !editData.data.manuallyEdited ||
      editData.data.personalizationStatus !== 'MANUALLY_EDITED' ||
      !editData.data.isApproved
    ) {
      throw new Error(`Individual candidate edit failed: ${JSON.stringify(editData)}`);
    }

    // Verify click-to-chat URL updated with new message
    if (!editData.data.clickToChatUrl.includes(encodeURIComponent('Special update'))) {
      throw new Error('clickToChatUrl was not updated with candidate override message');
    }

    // Verify original template is completely untouched
    const originalTemplateAfter = await MessageTemplate.findById(templateId);
    if (originalTemplateBefore?.content !== originalTemplateAfter?.content) {
      throw new Error('CRITICAL BUG: Individual candidate message edit altered the original template!');
    }

    // Verify Candidate A's message is untouched
    const rAAfter = await CampaignRecipient.findById(rA._id);
    if (rAAfter?.manuallyEdited || rAAfter?.personalizedMessage.includes('Special update')) {
      throw new Error('CRITICAL BUG: Candidate B edit altered Candidate A!');
    }
    console.log('✅ PASS: Candidate-level override updated recipient and wa.me link; original template and other candidates remained untouched');

    // 8. Reset Candidate Message to Template
    console.log('\n--- TEST 8: Reset Candidate Message to Template ---');
    const resetRes = await fetch(
      `${BASE_URL}/campaigns/${campaign._id}/recipients/${rB._id}/reset`,
      {
        method: 'POST',
        headers: {
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
      }
    );
    const resetData = (await resetRes.json()) as any;
    if (!resetData.success || resetData.data.manuallyEdited) {
      throw new Error('Reset candidate message failed');
    }
    console.log('✅ PASS: Candidate message reset back to template personalization');

    // 9. Recipient Approval, Exclusion, and Sending Safeguard
    console.log('\n--- TEST 9: Recipient Approval, Exclusion, and Dispatch Guard ---');
    // Exclude Candidate B
    const excludeRes = await fetch(
      `${BASE_URL}/campaigns/${campaign._id}/recipients/${rB._id}/exclude`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ reason: 'Student opted out' }),
      }
    );
    const excludeData = (await excludeRes.json()) as any;
    if (!excludeData.success || !excludeData.data.isExcluded) {
      throw new Error('Exclusion failed');
    }

    // Bulk approve all valid
    const bulkApproveRes = await fetch(`${BASE_URL}/campaigns/${campaign._id}/approve-all-valid`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });
    const bulkApproveData = (await bulkApproveRes.json()) as any;
    if (!bulkApproveData.success || bulkApproveData.data.approvedCount < 1) {
      throw new Error('Bulk approve failed');
    }

    // Verify getNextAssistedRecipient: Only Candidate A should be returned, NOT excluded Candidate B!
    const nextRes = await fetch(`${BASE_URL}/campaigns/${campaign._id}/next`, {
      headers: { Cookie: cookieHeader },
    });
    const nextData = (await nextRes.json()) as any;
    if (!nextData.success || nextData.data.recipient.candidateName !== 'Rahul Sharma') {
      throw new Error('Expected Candidate A to be served');
    }
    if (nextData.data.remainingCount !== 1) {
      throw new Error(`Expected remainingCount 1 (excluding Candidate B), got ${nextData.data.remainingCount}`);
    }
    console.log('✅ PASS: Dispatch guard verified: excluded or unapproved candidates are strictly prevented from entering assisted sending runner');

    // 10. Backward Compatibility check with Module 7 endpoints
    console.log('\n--- TEST 10: Backward Compatibility with Module 7 ---');
    const legacyTemplatesRes = await fetch(`${BASE_URL}/message-templates`, {
      headers: { Cookie: cookieHeader },
    });
    const legacyTemplatesData = (await legacyTemplatesRes.json()) as any;
    if (!legacyTemplatesData.success || legacyTemplatesData.data.length < 8) {
      throw new Error('Backward compatibility with /message-templates broken');
    }
    console.log('✅ PASS: Backward compatibility confirmed across /templates and /message-templates');

    console.log('\n================================================================');
    console.log('🎉 ALL MODULE 8 ADVANCED TEMPLATES & PERSONALIZATION TESTS PASSED (10/10)');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ MODULE 8 TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server!) server.close();
    await disconnectDatabase();
  }
}

runAdvancedTemplatesTestSuite();
