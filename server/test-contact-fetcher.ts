import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Company } from './src/models/Company.model';
import { Candidate } from './src/models/Candidate.model';
import { VirtualGroup } from './src/models/VirtualGroup.model';
import { GroupMembership } from './src/models/GroupMembership.model';
import { GroupActivity } from './src/models/GroupActivity.model';
import { FetchOperationHistory } from './src/models/FetchOperationHistory.model';
import http from 'http';
import * as xlsx from 'xlsx';

const PORT = 5059;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runContactFetcherTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 STARTING MODULE 6 CONTACT FETCHER TEST SUITE');
  console.log('======================================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Contact Fetcher test server running on ${BASE_URL}\n`);

    // Clean up test data
    await FetchOperationHistory.deleteMany({});
    await GroupActivity.deleteMany({});
    await GroupMembership.deleteMany({});
    await VirtualGroup.deleteMany({});
    await Company.deleteMany({});
    await Candidate.deleteMany({});

    // 1. Authenticate Admin
    console.log('--- STEP 1: Admin Authentication ---');
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

    console.log('✅ PASS: Admin logged in, auth cookies established');

    // TEST 1: Unauthorized Access Protection
    console.log('\n--- TEST 1: Unauthorized API Access Protection ---');
    const unauthRes = await fetch(`${BASE_URL}/contact-fetcher/candidates`);
    if (unauthRes.status === 401) {
      console.log('✅ PASS: GET /api/contact-fetcher/candidates blocked without auth (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 but got ${unauthRes.status}`);
    }

    // Seed test company & existing candidates
    console.log('\n--- STEP 2: Seed Test Drive & Candidates ---');
    const company = await Company.create({
      companyId: 'COMP-2026-FETCH1',
      companyName: 'Infosys Limited',
      jobRole: 'Systems Engineer',
      requiredCandidates: 10,
      requiredSkills: ['Java', 'SQL', 'Python'],
      eligibleBranches: ['Computer Science', 'Information Technology', 'Electronics'],
      eligibleDegrees: ['B.Tech', 'B.E.'],
      eligiblePassingYears: [2026],
      experienceType: 'Fresher',
      workMode: 'Office',
      recruitmentStatus: 'Active',
    });

    const group = await VirtualGroup.create({
      groupId: 'GRP-2026-INFY01',
      groupName: 'Infosys 2026 Recruitment',
      companyId: company._id,
      memberCount: 0,
      status: 'Active',
    });

    const cand1 = await Candidate.create({
      candidateId: 'CAND-2026-F0001',
      fullName: 'Rahul Sharma',
      phoneNumber: '9876543210',
      normalizedPhoneNumber: '+919876543210',
      email: 'rahul@example.com',
      degree: 'B.Tech',
      branch: 'Computer Science',
      passingYear: 2026,
      skills: ['Java', 'SQL', 'Python'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: true,
      whatsappConsentSource: 'Portal Registration',
    });

    const cand2 = await Candidate.create({
      candidateId: 'CAND-2026-F0002',
      fullName: 'Pooja Iyer',
      phoneNumber: '9876543211',
      normalizedPhoneNumber: '+919876543211',
      email: 'pooja@example.com',
      degree: 'B.Tech',
      branch: 'Information Technology',
      passingYear: 2026,
      skills: ['Java'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: false, // NO CONSENT
    });

    const candPlaced = await Candidate.create({
      candidateId: 'CAND-2026-F0003',
      fullName: 'Vikas Placed',
      phoneNumber: '9876543212',
      normalizedPhoneNumber: '+919876543212',
      email: 'vikas@example.com',
      degree: 'B.Tech',
      branch: 'Computer Science',
      passingYear: 2026,
      skills: ['Java', 'SQL'],
      experienceType: 'Fresher',
      placementStatus: 'Placed', // PLACED
      whatsappConsent: true,
    });

    const candInactive = await Candidate.create({
      candidateId: 'CAND-2026-F0004',
      fullName: 'Suresh Inactive',
      phoneNumber: '9876543213',
      normalizedPhoneNumber: '+919876543213',
      degree: 'B.Tech',
      branch: 'Mechanical Engineering', // Ineligible branch
      passingYear: 2024, // Ineligible year
      experienceType: 'Fresher',
      placementStatus: 'Inactive', // INACTIVE
      whatsappConsent: false,
    });

    console.log('✓ Seeded company, virtual group, and 4 test candidates');

    // TEST 2: Manual Contact Paste & Extraction
    console.log('\n--- TEST 2: Manual Number Paste Extraction & Categorization ---');
    const rawPasteText = `
      9876543210, +91 98765 43211
      9876543210
      9999988888
      +91-88888-77777
      invalid1234
    `;

    const pasteRes = await fetch(`${BASE_URL}/contact-fetcher/validate-numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ text: rawPasteText }),
    });

    const pasteData = (await pasteRes.json()) as any;
    if (pasteRes.status !== 200) {
      throw new Error(`Paste validation failed: ${JSON.stringify(pasteData)}`);
    }

    const pData = pasteData.data;
    if (pData.existingCount !== 2) {
      throw new Error(`Expected 2 existing candidates found, got ${pData.existingCount}`);
    }
    if (pData.unknownCount !== 2) {
      throw new Error(`Expected 2 unknown numbers (+919999988888, +918888877777), got ${pData.unknownCount}`);
    }
    if (pData.duplicateCount < 1) {
      throw new Error(`Expected at least 1 duplicate merged, got ${pData.duplicateCount}`);
    }
    if (pData.invalidCount !== 1) {
      throw new Error(`Expected 1 invalid string rejected, got ${pData.invalidCount}`);
    }
    console.log('✅ PASS: Manual number paste partitioned correctly:');
    console.log(`   - Existing candidates in DB: ${pData.existingCount}`);
    console.log(`   - Unknown valid numbers: ${pData.unknownCount}`);
    console.log(`   - Redundant duplicates merged: ${pData.duplicateCount}`);
    console.log(`   - Invalid phone strings: ${pData.invalidCount}`);

    // TEST 3: Create Candidate from Unknown Number
    console.log('\n--- TEST 3: Register Candidate Profile from Unknown Number ---');
    const createUnknownRes = await fetch(`${BASE_URL}/contact-fetcher/create-from-unknown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        candidates: [
          {
            fullName: 'Neha Unknown',
            phoneNumber: '+919999988888',
            email: 'neha@example.com',
            degree: 'B.Tech',
            branch: 'Computer Science',
            passingYear: 2026,
            skills: ['Java', 'SQL'],
            whatsappConsent: true,
          },
        ],
      }),
    });

    const createUnknownData = (await createUnknownRes.json()) as any;
    if (createUnknownRes.status !== 201 || createUnknownData.data.created.length !== 1) {
      throw new Error(`Create unknown candidate failed: ${JSON.stringify(createUnknownData)}`);
    }
    const newlyCreatedCand = createUnknownData.data.created[0];
    console.log(`✅ PASS: Unknown number registered as candidate: ${newlyCreatedCand.fullName} (${newlyCreatedCand.candidateId})`);

    // TEST 4: Candidate Database Fetcher with Multi-Criteria Filters
    console.log('\n--- TEST 4: Database Search with Concurrent Filters ---');
    const searchRes = await fetch(
      `${BASE_URL}/contact-fetcher/candidates?degree=B.Tech&branch=Computer%20Science&passingYear=2026`,
      { headers: { Cookie: cookieHeader } }
    );
    const searchData = (await searchRes.json()) as any;
    if (searchRes.status !== 200) {
      throw new Error(`Search failed: ${JSON.stringify(searchData)}`);
    }
    if (searchData.data.candidates.length < 2) {
      throw new Error(`Expected at least 2 filtered candidates, got ${searchData.data.candidates.length}`);
    }
    console.log(`✅ PASS: Database query returned ${searchData.data.candidates.length} candidates matching concurrent criteria`);

    // TEST 5: Company Eligibility Matching (Category A, B, and C)
    console.log('\n--- TEST 5: Company Criteria Categorization (A, B, C) ---');
    const matchRes = await fetch(`${BASE_URL}/contact-fetcher/match-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        candidateIds: [cand1._id, cand2._id, candInactive._id],
        groupId: group._id,
      }),
    });

    const matchData = (await matchRes.json()) as any;
    if (matchRes.status !== 200) {
      throw new Error(`Matching failed: ${JSON.stringify(matchData)}`);
    }

    const mData = matchData.data;
    if (mData.eligibleCount !== 1) {
      throw new Error(`Expected 1 eligible candidate (cand1), got ${mData.eligibleCount}`);
    }
    if (mData.partiallyMatchingCount !== 1) {
      throw new Error(`Expected 1 partially matching candidate (cand2 - partial skills), got ${mData.partiallyMatchingCount}`);
    }
    if (mData.notEligibleCount !== 1) {
      throw new Error(`Expected 1 not eligible candidate (candInactive - branch/batch fail), got ${mData.notEligibleCount}`);
    }
    console.log('✅ PASS: Company criteria categorized correctly into 3 buckets:');
    console.log(`   - Category A (Eligible): ${mData.eligibleCount}`);
    console.log(`   - Category B (Partially Matching): ${mData.partiallyMatchingCount}`);
    console.log(`   - Category C (Not Eligible): ${mData.notEligibleCount}`);

    // TEST 6: Smart Assignment Safeguards (Blocked Placed & Inactive)
    console.log('\n--- TEST 6: Smart Assignment Safeguards & Placed/Inactive Blocks ---');
    const assignSafeRes = await fetch(`${BASE_URL}/contact-fetcher/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        groupId: group._id,
        candidateIds: [cand1._id, candPlaced._id, candInactive._id],
        sourceType: 'DATABASE',
        allowPlaced: false, // Do NOT allow placed
        allowInactive: false, // Do NOT allow inactive
      }),
    });

    const assignSafeData = (await assignSafeRes.json()) as any;
    if (assignSafeRes.status !== 200) {
      throw new Error(`Safe assignment failed: ${JSON.stringify(assignSafeData)}`);
    }

    const safeResult = assignSafeData.data;
    if (safeResult.newlyAssigned !== 1) {
      throw new Error(`Expected only 1 newly assigned (cand1), got ${safeResult.newlyAssigned}`);
    }
    if (safeResult.blockedPlaced !== 1) {
      throw new Error(`Expected 1 placed candidate blocked, got ${safeResult.blockedPlaced}`);
    }
    if (safeResult.blockedInactive !== 1) {
      throw new Error(`Expected 1 inactive candidate blocked, got ${safeResult.blockedInactive}`);
    }
    console.log('✅ PASS: Smart assignment blocked Placed and Inactive candidates safely without override');

    // TEST 7: Duplicate Assignment Prevention
    console.log('\n--- TEST 7: Duplicate Group Assignment Prevention ---');
    const dupeAssignRes = await fetch(`${BASE_URL}/contact-fetcher/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        groupId: group._id,
        candidateIds: [cand1._id], // cand1 is already in group
        sourceType: 'DATABASE',
      }),
    });

    const dupeData = (await dupeAssignRes.json()) as any;
    if (dupeData.data.alreadyAssigned !== 1 || dupeData.data.newlyAssigned !== 0) {
      throw new Error(`Expected duplicate to be skipped as alreadyAssigned: ${JSON.stringify(dupeData)}`);
    }
    console.log('✅ PASS: Duplicate assignment skipped. Counted as alreadyAssigned: 1');

    // TEST 8: Explicit Admin Override for Placed Candidate
    console.log('\n--- TEST 8: Explicit Confirmation Override for Placed Candidate ---');
    const overrideRes = await fetch(`${BASE_URL}/contact-fetcher/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        groupId: group._id,
        candidateIds: [candPlaced._id],
        sourceType: 'DATABASE',
        allowPlaced: true, // Explicitly confirmed
      }),
    });

    const overrideData = (await overrideRes.json()) as any;
    if (overrideData.data.newlyAssigned !== 1) {
      throw new Error(`Expected placed candidate to be assigned with override: ${JSON.stringify(overrideData)}`);
    }
    console.log('✅ PASS: Placed candidate successfully assigned with explicit admin confirmation');

    // TEST 9: Operation Audit History Logging
    console.log('\n--- TEST 9: Fetch & Assignment Audit History ---');
    const historyRes = await fetch(`${BASE_URL}/contact-fetcher/history`, {
      headers: { Cookie: cookieHeader },
    });
    const historyData = (await historyRes.json()) as any;
    if (historyRes.status !== 200 || historyData.data.history.length < 2) {
      throw new Error(`History check failed: ${JSON.stringify(historyData)}`);
    }
    const lastOp = historyData.data.history[0];
    console.log(`✅ PASS: Audit history recorded operations. Latest: ${lastOp.operationId} (${lastOp.sourceType})`);

    // TEST 10: Downloadable CSV Audit Report
    console.log('\n--- TEST 10: Downloadable CSV Audit Report ---');
    const reportRes = await fetch(`${BASE_URL}/contact-fetcher/reports/${lastOp.operationId}/download`, {
      headers: { Cookie: cookieHeader },
    });
    if (reportRes.status !== 200) {
      throw new Error(`Report download failed with status ${reportRes.status}`);
    }
    const csvContent = await reportRes.text();
    if (!csvContent.includes('Placement Automation System') || !csvContent.includes(lastOp.operationId)) {
      throw new Error('CSV report content missing expected header metadata');
    }
    console.log('✅ PASS: Downloadable CSV audit report generated with valid metadata and metric sections');

    // TEST 11: WhatsApp Recipient Integration Readiness Resolver (Module 7 Prep)
    console.log('\n--- TEST 11: WhatsApp Recipient Readiness Resolver (Module 7 Prep) ---');
    const readyRes = await fetch(`${BASE_URL}/contact-fetcher/recipient-readiness/${group._id}`, {
      headers: { Cookie: cookieHeader },
    });
    const readyData = (await readyRes.json()) as any;
    if (readyRes.status !== 200) {
      throw new Error(`Readiness check failed: ${JSON.stringify(readyData)}`);
    }

    const rData = readyData.data;
    if (rData.totalActiveMembers < 2) {
      throw new Error(`Expected at least 2 active members, got ${rData.totalActiveMembers}`);
    }
    if (rData.readyRecipients.length < 1) {
      throw new Error(`Expected at least 1 messaging-ready recipient (cand1), got ${rData.readyRecipients.length}`);
    }
    console.log('✅ PASS: WhatsApp Recipient Readiness accurately resolved:');
    console.log(`   - Total Active Members: ${rData.totalActiveMembers}`);
    console.log(`   - Messaging Ready (Valid phone + recorded consent): ${rData.messagingReadyCount}`);
    console.log(`   - Blocked: ${rData.blockedRecipients.length}`);

    console.log('\n======================================================');
    console.log('🎉 ALL 11 MODULE 6 TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  } finally {
    if (server!) {
      server.close();
    }
    await disconnectDatabase();
  }
}

runContactFetcherTestSuite();

