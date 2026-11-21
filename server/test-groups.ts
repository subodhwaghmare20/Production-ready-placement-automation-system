import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Company } from './src/models/Company.model';
import { Candidate } from './src/models/Candidate.model';
import { VirtualGroup } from './src/models/VirtualGroup.model';
import { GroupMembership } from './src/models/GroupMembership.model';
import { GroupActivity } from './src/models/GroupActivity.model';
import http from 'http';

const PORT = 5058;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runVirtualGroupTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 STARTING MODULE 5 VIRTUAL GROUP & RESOLUTION TEST SUITE');
  console.log('======================================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Virtual Group test server running on ${BASE_URL}\n`);

    // Clean up test data
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
    console.log('\n--- TEST 1: Unauthorized API Access ---');
    const unauthRes = await fetch(`${BASE_URL}/groups`);
    if (unauthRes.status === 401) {
      console.log('✅ PASS: GET /api/groups rejected without auth (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 but got ${unauthRes.status}`);
    }

    // Seed test companies
    console.log('\n--- STEP 2: Seed Test Companies & Candidates ---');
    const compA = await Company.create({
      companyId: 'COMP-2026-TEST1',
      companyName: 'Acme Technologies',
      jobRole: 'Software Engineer',
      requiredCandidates: 5,
      requiredSkills: ['Node.js', 'React', 'MongoDB'],
      eligibleBranches: ['Computer Science', 'Information Technology'],
      eligibleDegrees: ['B.Tech', 'B.E.'],
      eligiblePassingYears: [2026],
      experienceType: 'Fresher',
      workMode: 'Office',
      recruitmentStatus: 'Active',
    });

    const compB = await Company.create({
      companyId: 'COMP-2026-TEST2',
      companyName: 'Beta Cloud Systems',
      jobRole: 'Cloud DevOps Trainee',
      requiredCandidates: 3,
      requiredSkills: ['AWS', 'Docker', 'Linux'],
      eligibleBranches: ['Computer Science', 'Electronics'],
      eligibleDegrees: ['B.Tech', 'M.Tech'],
      eligiblePassingYears: [2026, 2025],
      experienceType: 'Fresher',
      workMode: 'Hybrid',
      recruitmentStatus: 'Active',
    });

    // Seed test candidates
    const cand1 = await Candidate.create({
      candidateId: 'CAND-2026-00001',
      fullName: 'Aarav Sharma',
      phoneNumber: '9876543210',
      normalizedPhoneNumber: '+919876543210',
      email: 'aarav@example.com',
      degree: 'B.Tech',
      branch: 'Computer Science',
      passingYear: 2026,
      skills: ['Node.js', 'React', 'MongoDB', 'Docker'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: true,
      whatsappConsentAt: new Date(),
      whatsappConsentSource: 'Portal Registration',
    });

    const cand2 = await Candidate.create({
      candidateId: 'CAND-2026-00002',
      fullName: 'Bhavna Patel',
      phoneNumber: '9876543211',
      normalizedPhoneNumber: '+919876543211',
      email: 'bhavna@example.com',
      degree: 'B.Tech',
      branch: 'Information Technology',
      passingYear: 2026,
      skills: ['Node.js', 'React'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: false, // NO CONSENT
    });

    const cand3 = await Candidate.create({
      candidateId: 'CAND-2026-00003',
      fullName: 'Chetan Kumar',
      phoneNumber: '12345', // INVALID PHONE NUMBER
      normalizedPhoneNumber: '12345',
      email: 'chetan@example.com',
      degree: 'Mechanical',
      branch: 'Mechanical Engineering',
      passingYear: 2024, // INELIGIBLE YEAR & BRANCH
      skills: ['AutoCAD'],
      experienceType: 'Fresher',
      placementStatus: 'Available',
      whatsappConsent: true,
    });

    console.log('✓ Test companies and candidates seeded successfully.');

    // TEST 2: Create Virtual Group with Generated ID
    console.log('\n--- TEST 2: Create Virtual Group with ID Generation ---');
    const createGroupRes = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        companyId: compA._id,
        groupName: 'Acme 2026 Recruitment Drive',
        description: 'Primary applicant cluster for Acme campus selections',
        candidateIds: [cand1._id],
      }),
    });

    const createGroupData = (await createGroupRes.json()) as any;
    if (createGroupRes.status !== 201) {
      throw new Error(`Group creation failed: ${JSON.stringify(createGroupData)}`);
    }
    const groupA = createGroupData.data;
    if (!groupA.groupId || !groupA.groupId.startsWith('GRP-2026-')) {
      throw new Error(`Invalid groupId generated: ${groupA.groupId}`);
    }
    if (groupA.memberCount !== 1) {
      throw new Error(`Expected memberCount 1 but got ${groupA.memberCount}`);
    }
    console.log(`✅ PASS: Group created with ID ${groupA.groupId} and initial memberCount: ${groupA.memberCount}`);

    // TEST 3: One Primary Group Per Company Constraint (Conflict 409)
    console.log('\n--- TEST 3: One Primary Group Per Company Constraint ---');
    const duplicateGroupRes = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        companyId: compA._id,
        groupName: 'Duplicate Acme Group',
      }),
    });
    if (duplicateGroupRes.status === 409) {
      console.log('✅ PASS: Duplicate group for same company rejected with 409 Conflict');
    } else {
      throw new Error(`Expected 409 Conflict for duplicate company group, got ${duplicateGroupRes.status}`);
    }

    // TEST 4: Create Second Group for Different Company
    console.log('\n--- TEST 4: Create Group for Second Company ---');
    const groupBRes = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        companyId: compB._id,
        groupName: 'Beta Cloud 2026 Drive',
      }),
    });
    const groupBData = (await groupBRes.json()) as any;
    if (groupBRes.status !== 201) {
      throw new Error(`Group B creation failed: ${JSON.stringify(groupBData)}`);
    }
    const groupB = groupBData.data;
    console.log(`✅ PASS: Group for second company created: ${groupB.groupId}`);

    // TEST 5: Add Candidates to Group & Member Count Recalculation
    console.log('\n--- TEST 5: Add Candidates in Bulk ---');
    const addMembersRes = await fetch(`${BASE_URL}/groups/${groupA._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        candidateIds: [cand2._id, cand3._id],
      }),
    });
    const addMembersData = (await addMembersRes.json()) as any;
    if (addMembersRes.status !== 200) {
      throw new Error(`Add members failed: ${JSON.stringify(addMembersData)}`);
    }
    if (addMembersData.data.totalActiveMembers !== 3) {
      throw new Error(`Expected 3 total active members, got ${addMembersData.data.totalActiveMembers}`);
    }
    console.log(`✅ PASS: Candidates added. Total active members: ${addMembersData.data.totalActiveMembers}`);

    // TEST 6: Prevent Duplicate Active Membership in Same Group
    console.log('\n--- TEST 6: Prevent Duplicate Active Membership ---');
    const reAddMembersRes = await fetch(`${BASE_URL}/groups/${groupA._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        candidateIds: [cand1._id, cand2._id], // Already in group
      }),
    });
    const reAddData = (await reAddMembersRes.json()) as any;
    if (reAddData.data.alreadyActive !== 2 || reAddData.data.newlyAdded !== 0) {
      throw new Error(`Expected 2 already active and 0 newly added, got: ${JSON.stringify(reAddData)}`);
    }
    console.log('✅ PASS: Duplicate assignment prevented; counted as alreadyActive');

    // TEST 7: Cross-Group Candidate Membership (Candidate belongs to multiple groups)
    console.log('\n--- TEST 7: Candidate Belongs to Multiple Company Groups ---');
    const addCandToGroupBRes = await fetch(`${BASE_URL}/groups/${groupB._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        candidateIds: [cand1._id], // Cand1 is now in both Group A and Group B
      }),
    });
    const addCandToGroupBData = (await addCandToGroupBRes.json()) as any;
    if (addCandToGroupBRes.status !== 200 || addCandToGroupBData.data.totalActiveMembers !== 1) {
      throw new Error(`Failed to assign candidate to second group: ${JSON.stringify(addCandToGroupBData)}`);
    }
    console.log('✅ PASS: Candidate successfully assigned across multiple company groups');

    // TEST 8: Candidate Removal (Marks status 'Removed', preserves audit history)
    console.log('\n--- TEST 8: Candidate Removal & History Retention ---');
    const removeRes = await fetch(`${BASE_URL}/groups/${groupA._id}/members/${cand3._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ reason: 'Mechanical student opted out' }),
    });
    const removeData = (await removeRes.json()) as any;
    if (removeRes.status !== 200) {
      throw new Error(`Remove member failed: ${JSON.stringify(removeData)}`);
    }
    if (removeData.data.totalActiveMembers !== 2) {
      throw new Error(`Expected 2 active members after removal, got ${removeData.data.totalActiveMembers}`);
    }

    // Verify historical membership status is 'Removed'
    const membershipCheck = await GroupMembership.findOne({
      groupId: groupA._id,
      candidateId: cand3._id,
    });
    if (!membershipCheck || membershipCheck.membershipStatus !== 'Removed') {
      throw new Error('Membership was not retained as Removed!');
    }
    console.log('✅ PASS: Candidate removed from active count; historical record retained with status: Removed');

    // TEST 9: Reactivate Removed Member
    console.log('\n--- TEST 9: Reactivate Previously Removed Member ---');
    const reactivateRes = await fetch(`${BASE_URL}/groups/${groupA._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ candidateIds: [cand3._id] }),
    });
    const reactivateData = (await reactivateRes.json()) as any;
    if (reactivateData.data.reactivated !== 1 || reactivateData.data.totalActiveMembers !== 3) {
      throw new Error(`Reactivation failed: ${JSON.stringify(reactivateData)}`);
    }
    console.log('✅ PASS: Previously removed candidate seamlessly reactivated to Active');

    // Cleanly re-remove cand3 to test recipient resolution accurately
    await fetch(`${BASE_URL}/groups/${groupA._id}/members/${cand3._id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });

    // TEST 10: Automatic Candidate Eligibility Suggestion Logic
    console.log('\n--- TEST 10: Candidate Eligibility Intelligence ---');
    const eligibleRes = await fetch(`${BASE_URL}/groups/${groupA._id}/eligible-candidates`, {
      headers: { Cookie: cookieHeader },
    });
    const eligibleData = (await eligibleRes.json()) as any;
    if (eligibleRes.status !== 200) {
      throw new Error(`Eligibility check failed: ${JSON.stringify(eligibleData)}`);
    }
    console.log(`✅ PASS: Eligibility evaluations calculated for unassigned candidate pool`);

    // TEST 11: Pre-Broadcast WhatsApp Recipient Resolution Audit
    console.log('\n--- TEST 11: WhatsApp Recipient Resolution Audit ---');
    // Group A currently has cand1 (consent=true) and cand2 (consent=false).
    // Let's also add cand3 with invalid phone to test partition.
    await fetch(`${BASE_URL}/groups/${groupA._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ candidateIds: [cand3._id] }),
    });

    const resolutionRes = await fetch(`${BASE_URL}/groups/${groupA._id}/recipient-resolution`, {
      headers: { Cookie: cookieHeader },
    });
    const resolutionData = (await resolutionRes.json()) as any;
    if (resolutionRes.status !== 200) {
      throw new Error(`Resolution check failed: ${JSON.stringify(resolutionData)}`);
    }

    const resBody = resolutionData.data;
    if (resBody.totalActiveMembers !== 3) {
      throw new Error(`Expected 3 active members, got ${resBody.totalActiveMembers}`);
    }
    if (resBody.candidatesWithConsent.length !== 1) {
      throw new Error(`Expected 1 with consent, got ${resBody.candidatesWithConsent.length}`);
    }
    if (resBody.candidatesWithoutConsent.length !== 1) {
      throw new Error(`Expected 1 without consent, got ${resBody.candidatesWithoutConsent.length}`);
    }
    if (resBody.invalidPhoneNumbers.length !== 1) {
      throw new Error(`Expected 1 with invalid phone number, got ${resBody.invalidPhoneNumbers.length}`);
    }
    console.log('✅ PASS: WhatsApp Recipient Resolution partition accurate:');
    console.log(`   - Total Active Members: ${resBody.totalActiveMembers}`);
    console.log(`   - Eligible Consented Broadcast Pool: ${resBody.totalEligibleRecipients}`);
    console.log(`   - Without Consent (Blocked): ${resBody.candidatesWithoutConsent.length}`);
    console.log(`   - Invalid Phone Numbers (Flagged): ${resBody.invalidPhoneNumbers.length}`);

    // TEST 12: Group Overall Stats and Single Group Stats Endpoints
    console.log('\n--- TEST 12: Group Overall and Single Stats ---');
    const overallStatsRes = await fetch(`${BASE_URL}/groups/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const overallStatsData = (await overallStatsRes.json()) as any;
    if (overallStatsRes.status !== 200 || overallStatsData.data.totalGroups !== 2) {
      throw new Error(`Overall stats failed: ${JSON.stringify(overallStatsData)}`);
    }
    console.log('✅ PASS: GET /api/groups/stats returned overall metrics:');
    console.log(`   - Total Groups: ${overallStatsData.data.totalGroups}`);
    console.log(`   - Active Groups: ${overallStatsData.data.activeGroups}`);
    console.log(`   - Total Active Members: ${overallStatsData.data.totalActiveMembers}`);

    const singleStatsRes = await fetch(`${BASE_URL}/groups/${groupA._id}/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const singleStatsData = (await singleStatsRes.json()) as any;
    if (singleStatsRes.status !== 200 || singleStatsData.data.totalActive !== 3) {
      throw new Error(`Single group stats failed: ${JSON.stringify(singleStatsData)}`);
    }
    console.log('✅ PASS: GET /api/groups/:id/stats returned group-specific metrics');

    // TEST 13: Activity History Audit Log
    console.log('\n--- TEST 13: Activity History Audit Log ---');
    const activityRes = await fetch(`${BASE_URL}/groups/${groupA._id}/activities`, {
      headers: { Cookie: cookieHeader },
    });
    const activityData = (await activityRes.json()) as any;
    if (activityRes.status !== 200 || !Array.isArray(activityData.data) || activityData.data.length < 3) {
      throw new Error(`Activity history check failed: ${JSON.stringify(activityData)}`);
    }
    console.log(`✅ PASS: Activity timeline contains ${activityData.data.length} recorded audit events`);

    console.log('\n======================================================');
    console.log('🎉 ALL 13 MODULE 5 TESTS PASSED WITH 100% SUCCESS!');
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

runVirtualGroupTestSuite();

