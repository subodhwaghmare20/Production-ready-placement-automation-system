import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Company } from './src/models/Company.model';
import http from 'http';

const PORT = 5057;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runCompanyTestSuite() {
  console.log('\n========================================');
  console.log('🧪 STARTING MODULE 4 COMPANY TEST SUITE');
  console.log('========================================\n');

  let server: http.Server;

  try {
    const conn = await connectDatabase();
    if (!conn) throw new Error('Database connection failed');

    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Company test server running on ${BASE_URL}\n`);

    // Clean up test companies
    await Company.deleteMany({});

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
    const loginData = (await loginRes.json()) as any;
    const rawSetCookie = loginRes.headers.get('set-cookie') || '';
    const accessTokenMatch = rawSetCookie.match(/accessToken=([^;]+)/);
    const csrfTokenMatch = rawSetCookie.match(/csrfToken=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : '';
    const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : loginData.data?.csrfToken;
    const cookieHeader = `accessToken=${accessToken}; csrfToken=${csrfToken}`;

    console.log('✅ PASS: Admin logged in, auth cookies established');

    // TEST 1: Unauthorized access check
    console.log('\n--- TEST 1: Unauthorized API Access ---');
    const unauthRes = await fetch(`${BASE_URL}/companies`);
    if (unauthRes.status === 401) {
      console.log('✅ PASS: GET /api/companies blocked without auth (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 but got ${unauthRes.status}`);
    }

    // TEST 2: Invalid data validation
    console.log('\n--- TEST 2: Invalid Data Validation ---');
    const invalidRes = await fetch(`${BASE_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        companyName: '', // Missing name
        jobRole: '', // Missing role
        requiredCandidates: 0, // Must be >= 1
      }),
    });
    if (invalidRes.status === 400) {
      console.log('✅ PASS: POST /api/companies rejected invalid input (400 Bad Request)');
    } else {
      throw new Error(`Expected 400 for invalid data, got ${invalidRes.status}`);
    }

    // TEST 3: Create Company Drive
    console.log('\n--- TEST 3: Create Company Profile ---');
    const createRes = await fetch(`${BASE_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        companyName: 'Google India',
        industry: 'Software / Internet',
        website: 'https://careers.google.com',
        hrName: 'Sundar Placement',
        hrEmail: 'sundar@google.com',
        hrPhone: '+91 98765 00000',
        jobRole: 'Associate Software Engineer',
        jobDescription: 'Design scalable distributed systems and backend cloud APIs.',
        requiredCandidates: 10,
        requiredSkills: ['Go', 'Python', 'Kubernetes', 'Algorithms'],
        eligibleBranches: ['Computer Science', 'Information Technology'],
        eligibleDegrees: ['B.Tech', 'M.Tech'],
        eligiblePassingYears: [2026],
        experienceType: 'Fresher',
        minimumCGPA: 8.0,
        maximumBacklogs: 0,
        salaryPackage: '18 - 24 LPA',
        jobLocation: 'Bangalore',
        workMode: 'Hybrid',
        interviewMode: 'Online',
        interviewDate: '2026-12-15',
        recruitmentStatus: 'Active',
      }),
    });

    if (createRes.status !== 201) {
      const err = await createRes.json();
      throw new Error(`Company creation failed: ${JSON.stringify(err)}`);
    }

    const createdCompany = (await createRes.json() as any).data;
    if (
      createdCompany.companyId &&
      createdCompany.companyId.startsWith('COMP-') &&
      createdCompany.companyName === 'Google India' &&
      createdCompany.requiredCandidates === 10
    ) {
      console.log('✅ PASS: Company created successfully:');
      console.log(`   - Company ID: ${createdCompany.companyId}`);
      console.log(`   - Name: ${createdCompany.companyName}`);
      console.log(`   - Role: ${createdCompany.jobRole}`);
      console.log(`   - Openings: ${createdCompany.requiredCandidates}`);
    } else {
      throw new Error('Company creation response invalid');
    }

    // Create a 2nd company for filtering & stats tests
    await fetch(`${BASE_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        companyName: 'TCS Digital',
        industry: 'IT Services',
        jobRole: 'Systems Engineer',
        requiredCandidates: 50,
        jobLocation: 'Pune',
        experienceType: 'Fresher',
        recruitmentStatus: 'On Hold',
      }),
    });

    // TEST 4: View Company by ID
    console.log('\n--- TEST 4: View Company (GET /api/companies/:id) ---');
    const viewRes = await fetch(`${BASE_URL}/companies/${createdCompany._id}`, {
      headers: { Cookie: cookieHeader },
    });
    const viewData = (await viewRes.json() as any).data;
    if (viewRes.status === 200 && viewData.companyName === 'Google India') {
      console.log('✅ PASS: GET /api/companies/:id returned: ' + viewData.companyName);
    } else {
      throw new Error('View company failed');
    }

    // TEST 5: Get Company Requirements Matrix
    console.log('\n--- TEST 5: Requirements Matrix (GET /api/companies/:id/requirements) ---');
    const reqRes = await fetch(`${BASE_URL}/companies/${createdCompany._id}/requirements`, {
      headers: { Cookie: cookieHeader },
    });
    const reqData = (await reqRes.json() as any).data;
    if (
      reqRes.status === 200 &&
      reqData.criteria.minimumCGPA === 8 &&
      reqData.criteria.skills.includes('Kubernetes')
    ) {
      console.log('✅ PASS: Requirements matrix generated for candidate matching:');
      console.log(`   - Eligible Batches: ${reqData.criteria.eligiblePassingYears}`);
      console.log(`   - Min CGPA: ${reqData.criteria.minimumCGPA}`);
      console.log(`   - Skills: ${reqData.criteria.skills.join(', ')}`);
    } else {
      throw new Error('Requirements endpoint failed');
    }

    // TEST 6: Update Company
    console.log('\n--- TEST 6: Update Company (PUT /api/companies/:id) ---');
    const updateRes = await fetch(`${BASE_URL}/companies/${createdCompany._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        salaryPackage: '22 - 26 LPA',
        recruitmentStatus: 'Active',
      }),
    });
    const updatedData = (await updateRes.json() as any).data;
    if (updateRes.status === 200 && updatedData.salaryPackage === '22 - 26 LPA') {
      console.log('✅ PASS: Company details updated successfully');
    } else {
      throw new Error('Company update failed');
    }

    // TEST 7: Search and Filters
    console.log('\n--- TEST 7: Search and Filter Companies ---');
    const searchRes = await fetch(`${BASE_URL}/companies?search=Google&recruitmentStatus=Active`, {
      headers: { Cookie: cookieHeader },
    });
    const searchData = (await searchRes.json() as any).data;
    if (searchRes.status === 200 && searchData.companies.length === 1) {
      console.log('✅ PASS: Search matched company: ' + searchData.companies[0].companyName);
    } else {
      throw new Error('Company search/filter failed');
    }

    // TEST 8: Pagination
    console.log('\n--- TEST 8: Company Pagination ---');
    const pageRes = await fetch(`${BASE_URL}/companies?page=1&limit=1`, {
      headers: { Cookie: cookieHeader },
    });
    const pageData = (await pageRes.json() as any).data;
    if (pageRes.status === 200 && pageData.companies.length === 1 && pageData.pagination.total === 2) {
      console.log('✅ PASS: Pagination working correctly (Page 1 of 2, 1 item per page)');
    } else {
      throw new Error('Company pagination failed');
    }

    // TEST 9: Company Statistics API
    console.log('\n--- TEST 9: Company Statistics (GET /api/companies/stats) ---');
    const statsRes = await fetch(`${BASE_URL}/companies/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const statsData = (await statsRes.json() as any).data;
    if (
      statsRes.status === 200 &&
      statsData.totalCompanies === 2 &&
      statsData.activeCompanies === 1 &&
      statsData.onHoldCompanies === 1 &&
      statsData.totalRequiredCandidates === 60
    ) {
      console.log('✅ PASS: Company metrics verified:');
      console.log(`   - Total Companies: ${statsData.totalCompanies}`);
      console.log(`   - Active Drives: ${statsData.activeCompanies}`);
      console.log(`   - On Hold: ${statsData.onHoldCompanies}`);
      console.log(`   - Total Vacancies: ${statsData.totalRequiredCandidates}`);
    } else {
      throw new Error(`Stats mismatch: ${JSON.stringify(statsData)}`);
    }

    // TEST 10: Dashboard Count Integration
    console.log('\n--- TEST 10: Dashboard Count Integration ---');
    const dashRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const dashData = (await dashRes.json() as any).data;
    if (dashRes.status === 200 && dashData.totalCompanies === 2) {
      console.log('✅ PASS: GET /api/dashboard/stats returned actual count: 2 companies');
    } else {
      throw new Error(`Dashboard stats mismatch: expected 2, got ${dashData.totalCompanies}`);
    }

    // TEST 11: Delete Company
    console.log('\n--- TEST 11: Delete Company (DELETE /api/companies/:id) ---');
    const deleteRes = await fetch(`${BASE_URL}/companies/${createdCompany._id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });
    if (deleteRes.status === 200) {
      console.log('✅ PASS: Company deleted successfully');
      const verifyDeleted = await Company.findById(createdCompany._id);
      if (!verifyDeleted) {
        console.log('✅ PASS: Confirmed deletion in MongoDB');
      } else {
        throw new Error('Company still exists in DB');
      }
    } else {
      throw new Error('Delete company failed');
    }

    console.log('\n========================================');
    console.log('🎉 ALL MODULE 4 COMPANY TESTS PASSED PERFECTLY!');
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

runCompanyTestSuite();

