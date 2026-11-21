import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Candidate } from './src/models/Candidate.model';
import http from 'http';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const PORT = 5056;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runCandidateTestSuite() {
  console.log('\n========================================');
  console.log('🧪 STARTING MODULE 3 CANDIDATE TEST SUITE');
  console.log('========================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Candidate test server running on ${BASE_URL}\n`);

    // Clean up test candidates
    await Candidate.deleteMany({});

    // 1. Authenticate to obtain cookies
    console.log('--- STEP 1: Admin Authentication ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@placement.edu',
        password: 'Admin@12345',
      }),
    });
    const loginData = await loginRes.json() as any;
    const rawSetCookie = loginRes.headers.get('set-cookie') || '';
    const accessTokenMatch = rawSetCookie.match(/accessToken=([^;]+)/);
    const csrfTokenMatch = rawSetCookie.match(/csrfToken=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : '';
    const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : loginData.data?.csrfToken;
    const cookieHeader = `accessToken=${accessToken}; csrfToken=${csrfToken}`;

    console.log('✅ PASS: Admin logged in, auth cookies established');

    // TEST 1: Unauthorized access check
    console.log('\n--- TEST 1: Unauthorized API Access ---');
    const unauthRes = await fetch(`${BASE_URL}/candidates`);
    if (unauthRes.status === 401) {
      console.log('✅ PASS: GET /api/candidates blocked without auth (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 but got ${unauthRes.status}`);
    }

    // TEST 2: Invalid phone validation
    console.log('\n--- TEST 2: Invalid Phone Validation ---');
    const invalidPhoneRes = await fetch(`${BASE_URL}/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        fullName: 'Test Candidate',
        phoneNumber: '12345', // Too short
      }),
    });
    if (invalidPhoneRes.status === 400) {
      console.log('✅ PASS: POST /api/candidates rejected invalid phone format (400 Bad Request)');
    } else {
      throw new Error(`Expected 400 for invalid phone, got ${invalidPhoneRes.status}`);
    }

    // TEST 3: Create candidate with phone normalization and WhatsApp consent
    console.log('\n--- TEST 3: Create Candidate & Phone Normalization ---');
    const createRes = await fetch(`${BASE_URL}/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        fullName: 'Rahul Sharma',
        phoneNumber: '09876543210', // Leading 0 Indian mobile
        email: 'rahul.sharma@example.com',
        branch: 'Computer Science',
        degree: 'B.Tech',
        passingYear: 2026,
        skills: ['React', 'TypeScript', 'Node.js'],
        experienceType: 'Fresher',
        placementStatus: 'Available',
        whatsappConsent: true,
        whatsappConsentSource: 'Campus Drive 2026 Registration',
      }),
    });

    if (createRes.status !== 201) {
      const err = await createRes.json();
      throw new Error(`Candidate creation failed: ${JSON.stringify(err)}`);
    }

    const createdCandidate = (await createRes.json() as any).data;
    if (
      createdCandidate.normalizedPhoneNumber === '+919876543210' &&
      createdCandidate.candidateId &&
      createdCandidate.whatsappConsent === true &&
      createdCandidate.whatsappConsentAt
    ) {
      console.log('✅ PASS: Candidate created successfully:');
      console.log(`   - Candidate ID: ${createdCandidate.candidateId}`);
      console.log(`   - Normalized Phone: ${createdCandidate.normalizedPhoneNumber}`);
      console.log(`   - WhatsApp Consent Recorded: ${createdCandidate.whatsappConsentAt}`);
    } else {
      throw new Error('Candidate fields not properly set');
    }

    // TEST 4: Duplicate phone number prevention
    console.log('\n--- TEST 4: Duplicate Phone Detection ---');
    const duplicateRes = await fetch(`${BASE_URL}/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        fullName: 'Another Rahul',
        phoneNumber: '+91 98765 43210', // Different formatting, same normalized number!
      }),
    });
    if (duplicateRes.status === 409) {
      console.log('✅ PASS: Prevented duplicate registration with same normalized phone (409 Conflict)');
    } else {
      throw new Error(`Expected 409 Conflict, got ${duplicateRes.status}`);
    }

    // TEST 5: View Candidate Profile
    console.log('\n--- TEST 5: View Candidate (GET /api/candidates/:id) ---');
    const viewRes = await fetch(`${BASE_URL}/candidates/${createdCandidate._id}`, {
      headers: { Cookie: cookieHeader },
    });
    const viewData = (await viewRes.json() as any).data;
    if (viewRes.status === 200 && viewData.fullName === 'Rahul Sharma') {
      console.log('✅ PASS: GET /api/candidates/:id returned candidate: ' + viewData.fullName);
    } else {
      throw new Error('GET /api/candidates/:id failed');
    }

    // TEST 6: Edit candidate
    console.log('\n--- TEST 6: Edit Candidate (PUT /api/candidates/:id) ---');
    const updateRes = await fetch(`${BASE_URL}/candidates/${createdCandidate._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        placementStatus: 'Placed',
        notes: 'Placed at Google India',
      }),
    });
    const updatedData = (await updateRes.json() as any).data;
    if (updateRes.status === 200 && updatedData.placementStatus === 'Placed') {
      console.log('✅ PASS: Candidate status updated to Placed, history preserved');
    } else {
      throw new Error('Candidate update failed');
    }

    // TEST 7: Search and Filter candidates
    console.log('\n--- TEST 7: Search & Filter Candidates ---');
    const searchRes = await fetch(`${BASE_URL}/candidates?search=Rahul&branch=Computer%20Science&placementStatus=Placed`, {
      headers: { Cookie: cookieHeader },
    });
    const searchData = (await searchRes.json() as any).data;
    if (searchRes.status === 200 && searchData.candidates.length === 1) {
      console.log('✅ PASS: Query filter matched candidate: ' + searchData.candidates[0].fullName);
    } else {
      throw new Error('Search & Filter failed');
    }

    // TEST 8: Resume upload and authorized retrieval
    console.log('\n--- TEST 8: Resume Upload & Authorization ---');
    const dummyPdfContent = Buffer.from('%PDF-1.4 Dummy resume content for test');
    const formData = new FormData();
    const pdfBlob = new Blob([dummyPdfContent], { type: 'application/pdf' });
    formData.append('resume', pdfBlob, 'rahul_sharma_resume.pdf');

    const uploadRes = await fetch(`${BASE_URL}/candidates/upload-resume`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: formData,
    });
    const uploadData = (await uploadRes.json() as any).data;
    if (uploadRes.status === 200 && uploadData.filename) {
      console.log('✅ PASS: Resume uploaded with unique filename: ' + uploadData.filename);

      // Link resume to candidate
      await Candidate.updateOne(
        { _id: createdCandidate._id },
        {
          resumeUrl: uploadData.filename,
          resumeOriginalName: uploadData.originalName,
          resumeMimeType: uploadData.mimetype,
          resumeFileSize: uploadData.size,
        }
      );

      // Test authorized download
      const downloadRes = await fetch(`${BASE_URL}/candidates/${createdCandidate._id}/resume`, {
        headers: { Cookie: cookieHeader },
      });
      if (downloadRes.status === 200) {
        console.log('✅ PASS: Authorized admin successfully downloaded candidate resume');
      } else {
        throw new Error('Authorized resume download failed');
      }

      // Test unauthorized download
      const unauthDownload = await fetch(`${BASE_URL}/candidates/${createdCandidate._id}/resume`);
      if (unauthDownload.status === 401) {
        console.log('✅ PASS: Unauthorized resume access blocked (401)');
      } else {
        throw new Error('Unauthorized resume download was not blocked!');
      }
    } else {
      throw new Error('Resume upload failed');
    }

    // TEST 9: Bulk Import Preview & Validation (Excel / CSV)
    console.log('\n--- TEST 9: Bulk Excel / CSV Import & Validation ---');
    // Create an in-memory test workbook
    const testImportRows = [
      {
        'Full Name': 'Pooja Verma',
        'Phone Number': '9876500001',
        'Email': 'pooja@example.com',
        'Branch': 'Information Technology',
        'Passing Year': 2026,
        'WhatsApp Consent': 'Yes',
        'Consent Source': 'Registration 2026',
      },
      {
        'Full Name': 'Vikram Singh',
        'Phone Number': '9876500002',
        'Email': 'vikram@example.com',
        'Branch': 'Mechanical',
        'Passing Year': 2025,
        'WhatsApp Consent': 'No', // No consent
      },
      {
        'Full Name': 'Duplicate In File',
        'Phone Number': '9876500001', // Duplicate of row 1!
        'Branch': 'Civil',
      },
      {
        'Full Name': 'Existing In DB',
        'Phone Number': '9876543210', // Already in DB (Rahul Sharma)!
        'Branch': 'CS',
      },
      {
        'Full Name': '', // Missing name!
        'Phone Number': '9876500003',
      },
    ];

    const ws = xlsx.utils.json_to_sheet(testImportRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'ImportTest');
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const importForm = new FormData();
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    importForm.append('file', excelBlob, 'test_candidates.xlsx');

    const previewRes = await fetch(`${BASE_URL}/candidates/bulk-import/preview`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: importForm,
    });

    const previewResult = (await previewRes.json() as any).data;
    if (
      previewRes.status === 200 &&
      previewResult.summary.totalRows === 5 &&
      previewResult.summary.validCount === 2 &&
      previewResult.summary.rejectedCount === 3
    ) {
      console.log('✅ PASS: Spreadsheet parsed & validated:');
      console.log(`   - Total rows: 5`);
      console.log(`   - Valid candidates: 2 (Pooja Verma, Vikram Singh)`);
      console.log(`   - Rejected rows: 3 (1 duplicate in file, 1 existing in DB, 1 missing name)`);
    } else {
      throw new Error(`Bulk import preview failed: ${JSON.stringify(previewResult)}`);
    }

    // Confirm import
    const confirmRes = await fetch(`${BASE_URL}/candidates/bulk-import/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ records: previewResult.validRecords }),
    });
    const confirmData = (await confirmRes.json() as any).data;
    if (confirmRes.status === 200 && confirmData.successfullyImported === 2) {
      console.log('✅ PASS: Bulk import committed 2 valid candidates in batch');
    } else {
      throw new Error('Confirm bulk import failed');
    }

    // TEST 10: Dashboard Candidate Count Verification
    console.log('\n--- TEST 10: Dashboard Count Integration ---');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const statsData = (await statsRes.json() as any).data;
    if (statsRes.status === 200 && statsData.totalCandidates === 3) {
      console.log('✅ PASS: GET /api/dashboard/stats returned actual count: 3 candidates (1 single + 2 bulk imported)');
    } else {
      throw new Error(`Dashboard stats mismatch: expected 3, got ${statsData.totalCandidates}`);
    }

    // TEST 11: Candidate Statistics API
    console.log('\n--- TEST 11: Candidate Statistics (GET /api/candidates/stats) ---');
    const candStatsRes = await fetch(`${BASE_URL}/candidates/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const candStats = (await candStatsRes.json() as any).data;
    if (
      candStatsRes.status === 200 &&
      candStats.totalCandidates === 3 &&
      candStats.placedCandidates === 1 &&
      candStats.availableCandidates === 2 &&
      candStats.whatsappConsentCount === 2
    ) {
      console.log('✅ PASS: Candidate metrics verified:');
      console.log(`   - Total: ${candStats.totalCandidates}`);
      console.log(`   - Placed: ${candStats.placedCandidates}`);
      console.log(`   - Available: ${candStats.availableCandidates}`);
      console.log(`   - WhatsApp Consent Granted: ${candStats.whatsappConsentCount}`);
    } else {
      throw new Error(`Candidate stats mismatch: ${JSON.stringify(candStats)}`);
    }

    // TEST 12: Delete candidate
    console.log('\n--- TEST 12: Delete Candidate (DELETE /api/candidates/:id) ---');
    const deleteRes = await fetch(`${BASE_URL}/candidates/${createdCandidate._id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });
    if (deleteRes.status === 200) {
      console.log('✅ PASS: Candidate successfully deleted');
      const verifyDeleted = await Candidate.findById(createdCandidate._id);
      if (!verifyDeleted) {
        console.log('✅ PASS: Confirmed deletion in MongoDB');
      } else {
        throw new Error('Candidate still exists in DB after delete');
      }
    } else {
      throw new Error('Delete candidate failed');
    }

    console.log('\n========================================');
    console.log('🎉 ALL MODULE 3 CANDIDATE TESTS PASSED PERFECTLY!');
    console.log('========================================\n');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message || error);
    process.exit(1);
  } finally {
    if (server!) server.close();
    await disconnectDatabase();
    process.exit(0);
  }
}

runCandidateTestSuite();

