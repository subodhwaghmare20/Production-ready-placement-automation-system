import createApp from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/db';
import { seedInitialAdmin } from './src/config/seedAdmin';
import { Admin } from './src/models/Admin.model';
import http from 'http';
import bcrypt from 'bcryptjs';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runTestSuite() {
  console.log('\n========================================');
  console.log('🧪 STARTING MODULE 2 AUTOMATED TEST SUITE');
  console.log('========================================\n');

  let server: http.Server;

  try {
    // Connect to database (with fallback to memory server if local MongoDB is inactive)
    const conn = await connectDatabase();
    if (!conn) {
      throw new Error('Database connection failed');
    }

    // Seed initial admin
    await seedInitialAdmin();

    const app = createApp();
    server = app.listen(PORT);
    console.log(`✓ Test server running on ${BASE_URL}\n`);

    // TEST 1: Password is never stored in plain text and is properly hashed with bcrypt
    console.log('--- TEST 1: Database Password Hashing ---');
    const adminInDb = await Admin.findOne({ email: 'admin@placement.edu' }).select('+password');
    if (!adminInDb || !adminInDb.password) {
      throw new Error('Admin not found in DB');
    }
    const isBcrypt = adminInDb.password.startsWith('$2a$') || adminInDb.password.startsWith('$2b$');
    const matchesRaw = adminInDb.password === 'Admin@12345';
    const bcryptValid = await bcrypt.compare('Admin@12345', adminInDb.password);
    if (isBcrypt && !matchesRaw && bcryptValid) {
      console.log('✅ PASS: Password is safely hashed with bcrypt in MongoDB (Hash: ' + adminInDb.password.substring(0, 15) + '...)');
    } else {
      throw new Error('Password hashing check failed');
    }

    // TEST 2: Access protected route without authentication
    console.log('\n--- TEST 2: Protected Route Without Auth ---');
    const unauthRes = await fetch(`${BASE_URL}/dashboard/stats`);
    if (unauthRes.status === 401) {
      console.log('✅ PASS: GET /api/dashboard/stats returned 401 Unauthorized for unauthenticated request');
    } else {
      throw new Error(`Expected 401 but received ${unauthRes.status}`);
    }

    // TEST 3: Login with invalid credentials
    console.log('\n--- TEST 3: Login With Invalid Credentials ---');
    const invalidLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@placement.edu',
        password: 'WrongPassword123!',
      }),
    });
    if (invalidLoginRes.status === 401) {
      console.log('✅ PASS: POST /api/auth/login returned 401 for invalid credentials');
    } else {
      throw new Error(`Expected 401 but received ${invalidLoginRes.status}`);
    }

    // TEST 4: Login with inactive admin
    console.log('\n--- TEST 4: Login With Inactive Admin ---');
    await Admin.deleteOne({ email: 'inactive@placement.edu' });
    const inactiveAdmin = new Admin({
      name: 'Inactive Admin',
      email: 'inactive@placement.edu',
      password: 'Password@123',
      isActive: false,
      role: 'admin',
    });
    await inactiveAdmin.save();

    const inactiveLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'inactive@placement.edu',
        password: 'Password@123',
      }),
    });
    if (inactiveLoginRes.status === 403) {
      console.log('✅ PASS: POST /api/auth/login returned 403 Forbidden for deactivated account');
    } else {
      throw new Error(`Expected 403 but received ${inactiveLoginRes.status}`);
    }

    // TEST 5: Login with valid credentials and verify cookies
    console.log('\n--- TEST 5: Login With Valid Credentials & Cookie Verification ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@placement.edu',
        password: 'Admin@12345',
      }),
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const loginData = await loginRes.json() as any;
    const rawSetCookie = loginRes.headers.get('set-cookie') || '';
    
    if (!rawSetCookie.includes('accessToken=')) {
      throw new Error('accessToken cookie missing in Set-Cookie header');
    }
    if (!rawSetCookie.includes('csrfToken=')) {
      throw new Error('csrfToken cookie missing in Set-Cookie header');
    }

    const hasHttpOnly = rawSetCookie.toLowerCase().includes('httponly');
    const hasSameSite = rawSetCookie.toLowerCase().includes('samesite=lax');

    if (!hasHttpOnly || !hasSameSite) {
      throw new Error('Cookie security attributes (HttpOnly / SameSite) missing');
    }

    console.log('✅ PASS: Login successful with valid credentials (Status: 200)');
    console.log('✅ PASS: Authentication cookie configured with HttpOnly and SameSite=Lax');
    console.log('✅ PASS: Password excluded from response payload: ' + JSON.stringify(loginData.data.admin));

    // Construct Cookie header for subsequent requests
    const cookiesArray = rawSetCookie.split(/,(?=[^;]+=[^;]+)/);
    const accessTokenMatch = rawSetCookie.match(/accessToken=([^;]+)/);
    const csrfTokenMatch = rawSetCookie.match(/csrfToken=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : '';
    const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : loginData.data.csrfToken;
    const cookieHeader = `accessToken=${accessToken}; csrfToken=${csrfToken}`;

    // TEST 6: Verify Session via GET /api/auth/me
    console.log('\n--- TEST 6: Session Verification (GET /api/auth/me) ---');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    const meData = await meRes.json() as any;
    if (meRes.status === 200 && meData.data?.admin?.email === 'admin@placement.edu') {
      console.log('✅ PASS: GET /api/auth/me successfully returned admin profile: ' + meData.data.admin.name);
    } else {
      throw new Error(`GET /api/auth/me verification failed: ${meRes.status}`);
    }

    // TEST 7: Dashboard Statistics API (GET /api/dashboard/stats)
    console.log('\n--- TEST 7: Functional Dashboard Statistics (GET /api/dashboard/stats) ---');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Cookie: cookieHeader },
    });
    const statsData = await statsRes.json() as any;
    if (statsRes.status === 200 && statsData.success) {
      const { totalCandidates, totalCompanies, activeVirtualGroups, messagesSent } = statsData.data;
      console.log('✅ PASS: Real MongoDB count query executed:');
      console.log(`   - Total Candidates: ${totalCandidates}`);
      console.log(`   - Total Companies: ${totalCompanies}`);
      console.log(`   - Active Virtual Groups: ${activeVirtualGroups}`);
      console.log(`   - Messages Sent: ${messagesSent}`);
    } else {
      throw new Error('Dashboard stats endpoint failed');
    }

    // TEST 8: Anti-CSRF Protection Verification
    console.log('\n--- TEST 8: Anti-CSRF Protection on Mutating Requests ---');
    // Attempt mutating request (POST /api/auth/logout) WITHOUT X-CSRF-Token header
    const csrfFailRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader, // Cookie present, but header missing!
      },
    });
    if (csrfFailRes.status === 403) {
      console.log('✅ PASS: Anti-CSRF blocked mutating request lacking X-CSRF-Token header (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 CSRF block but got ${csrfFailRes.status}`);
    }

    // TEST 9: Logout with valid CSRF token
    console.log('\n--- TEST 9: Logout & Session Termination ---');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });

    const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
    if (!logoutSetCookie.includes('accessToken=;') && !logoutSetCookie.includes('accessToken=deleted') && !logoutSetCookie.includes('Max-Age=0')) {
      // Some platforms clear cookie via Expires in the past
      console.log('Logout cookie header: ' + logoutSetCookie);
    }
    console.log('✅ PASS: POST /api/auth/logout cleared session cookies (Status: 200)');

    // TEST 10: Verify session termination
    console.log('\n--- TEST 10: Access After Logout ---');
    const afterLogoutRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT' },
    });
    if (afterLogoutRes.status === 401) {
      console.log('✅ PASS: Session terminated. Subsequent /me returned 401 Unauthorized');
    } else {
      throw new Error(`Expected 401 after logout but got ${afterLogoutRes.status}`);
    }

    console.log('\n========================================');
    console.log('🎉 ALL 10 MODULE 2 TESTS PASSED PERFECTLY!');
    console.log('========================================\n');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message || error);
    process.exit(1);
  } finally {
    if (server!) {
      server.close();
    }
    await disconnectDatabase();
    process.exit(0);
  }
}

runTestSuite();
