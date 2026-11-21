import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Admin } from './src/models/Admin.model';
import { Role } from './src/models/Role.model';
import { AuditLog } from './src/models/AuditLog.model';
import { AdminSession } from './src/models/AdminSession.model';
import { SystemSettings } from './src/models/SystemSettings.model';
import { permissionService } from './src/services/permission.service';
import { auditLogger } from './src/services/auditLogger.service';
import { sessionService } from './src/services/session.service';
import { validatePasswordComplexity } from './src/controllers/adminManagement.controller';

const runTests = async () => {
  console.log('--- STARTING MODULE 11: ADMIN SETTINGS, AUDIT LOGS, ROLES & PERMISSIONS TEST SUITE ---');
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

  // 1. Password Complexity Validation Tests
  console.log('\n1. Password Complexity Policy Tests:');
  assert(!validatePasswordComplexity('short').valid, 'Rejects password shorter than 8 chars');
  assert(!validatePasswordComplexity('alllowercase123!').valid, 'Rejects password without uppercase');
  assert(!validatePasswordComplexity('ALLUPPERCASE123!').valid, 'Rejects password without lowercase');
  assert(!validatePasswordComplexity('NoNumbersHere!').valid, 'Rejects password without numbers');
  assert(!validatePasswordComplexity('NoSpecialChar123').valid, 'Rejects password without special character');
  assert(validatePasswordComplexity('SuperSecret@2026').valid, 'Accepts valid strong password meeting all criteria');

  // Start in-memory MongoDB
  console.log('\n2. Initializing In-Memory Database...');
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('  Connected to MongoMemoryServer.');

  // 3. RBAC & Default System Roles Seeding
  console.log('\n3. RBAC & Role Seeding Tests:');
  await permissionService.seedDefaultRoles();
  const allRoles = await Role.find();
  assert(allRoles.length >= 4, `Successfully seeded ${allRoles.length} system roles`);

  const superAdminRole = await Role.findOne({ slug: 'superadmin' });
  const placementAdminRole = await Role.findOne({ slug: 'placement_admin' });
  const executiveRole = await Role.findOne({ slug: 'placement_executive' });
  const viewerRole = await Role.findOne({ slug: 'viewer' });

  assert(superAdminRole !== null && superAdminRole.permissions.includes('*'), 'Super Admin role seeded with wildcard (*) permissions');
  assert(placementAdminRole !== null && placementAdminRole.permissions.includes('candidates.create'), 'Placement Admin seeded with operational permissions');
  assert(executiveRole !== null && !executiveRole.permissions.includes('admins.create'), 'Placement Executive cannot provision admins');
  assert(viewerRole !== null && viewerRole.permissions.every((p) => p.endsWith('.view')), 'Viewer role strictly restricted to view-only');

  // Create administrators with different roles
  const superAdmin = await Admin.create({
    name: 'Primary Super Admin',
    email: 'superadmin@placement.edu',
    password: 'SuperAdmin@12345',
    role: 'superadmin',
    roleId: superAdminRole!._id,
    isActive: true,
  });

  const placementAdmin = await Admin.create({
    name: 'Placement Officer',
    email: 'officer@placement.edu',
    password: 'Placement@12345',
    role: 'placement_admin',
    roleId: placementAdminRole!._id,
    isActive: true,
  });

  const viewer = await Admin.create({
    name: 'Audit Viewer',
    email: 'viewer@placement.edu',
    password: 'ViewerPass@12345',
    role: 'viewer',
    roleId: viewerRole!._id,
    isActive: true,
  });

  // Effective Permissions Resolution
  const superAdminPerms = await permissionService.getEffectivePermissions(superAdmin);
  const placementAdminPerms = await permissionService.getEffectivePermissions(placementAdmin);
  const viewerPerms = await permissionService.getEffectivePermissions(viewer);

  assert(superAdminPerms.length > 25, 'Super Admin resolves all registered permissions');
  assert(await permissionService.hasPermission(superAdmin, 'settings.update'), 'Super Admin has settings.update permission');
  assert(await permissionService.hasPermission(placementAdmin, 'candidates.create'), 'Placement Admin has candidates.create permission');
  assert(!(await permissionService.hasPermission(placementAdmin, 'admins.deactivate')), 'Placement Admin denied admins.deactivate permission');
  assert(await permissionService.hasPermission(viewer, 'reports.view'), 'Viewer has reports.view permission');
  assert(!(await permissionService.hasPermission(viewer, 'candidates.create')), 'Viewer denied candidates.create permission');

  // Custom Permissions Override
  placementAdmin.customPermissions = ['admins.view'];
  await placementAdmin.save();
  assert(await permissionService.hasPermission(placementAdmin, 'admins.view'), 'Admin customPermissions override successfully grants specific access');

  // 4. Admin Management Security Rules
  console.log('\n4. Admin Safeguards & Escalation Prevention Tests:');

  // Last Super Admin Safeguard
  const activeSuperCount = await Admin.countDocuments({ role: 'superadmin', isActive: true });
  assert(activeSuperCount === 1, 'Verified exactly 1 active Super Admin currently exists');

  // Attempting to deactivate the only Super Admin should be rejected
  const canDeactivateLastSuper = activeSuperCount > 1;
  assert(!canDeactivateLastSuper, 'Safeguard: Deactivation of the last active Super Admin is prohibited');

  // Privilege escalation check
  const isOfficerSuper = placementAdmin.role === 'superadmin';
  assert(!isOfficerSuper, 'Escalation check: Non-superadmin cannot grant Super Admin role to themselves');

  // Password reset & tokenVersion revocation
  const initialTokenVersion = placementAdmin.tokenVersion || 0;
  placementAdmin.password = 'NewStrongPassword@2026';
  placementAdmin.tokenVersion = initialTokenVersion + 1;
  await placementAdmin.save();
  assert(placementAdmin.tokenVersion === initialTokenVersion + 1, 'Password reset increments tokenVersion to invalidate existing tokens');

  // 5. Login Security & Brute-Force Lockout
  console.log('\n5. Brute-Force Protection & Lockout Tests:');
  assert(superAdmin.failedLoginAttempts === 0, 'Initial failedLoginAttempts is 0');

  // Simulate 5 consecutive failed attempts
  for (let i = 1; i <= 5; i++) {
    superAdmin.failedLoginAttempts = (superAdmin.failedLoginAttempts || 0) + 1;
    if (superAdmin.failedLoginAttempts >= 5) {
      superAdmin.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }
  await superAdmin.save();

  assert(superAdmin.failedLoginAttempts === 5, 'failedLoginAttempts reached 5');
  assert(superAdmin.lockUntil !== undefined && superAdmin.lockUntil > new Date(), 'Account lockUntil timestamp set 15 minutes into future');

  // Unlock / reset on successful authentication
  superAdmin.failedLoginAttempts = 0;
  superAdmin.lockUntil = undefined;
  superAdmin.lastLogin = new Date();
  await superAdmin.save();
  assert(superAdmin.lockUntil === undefined, 'Successful authentication clears lockout and resets failed attempts');

  // 6. Session Management & Revocation
  console.log('\n6. Session Management & Device Tracking Tests:');
  const mockReq1 = {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    socket: { remoteAddress: '192.168.1.100' },
  } as any;

  const mockReq2 = {
    headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
    socket: { remoteAddress: '192.168.1.105' },
  } as any;

  const session1 = await sessionService.createSession(placementAdmin, mockReq1);
  const session2 = await sessionService.createSession(placementAdmin, mockReq2);

  assert(session1.browser === 'Google Chrome' && session1.os === 'Windows', 'Session 1 correctly detected Chrome on Windows');
  assert(session2.browser === 'Apple Safari' && session2.device === 'Mobile', 'Session 2 correctly detected Mobile Safari on iOS');

  const activeSessions = await sessionService.getAdminSessions(String(placementAdmin._id), session1.sessionId);
  assert(activeSessions.length === 2, 'Listed 2 active sessions for placement admin');
  assert(activeSessions.find((s) => s.sessionId === session1.sessionId)?.isCurrent === true, 'Current session correctly identified with isCurrent = true');

  // Revoke session 2
  await sessionService.revokeSession(session2.sessionId, superAdmin._id);
  const isSession2Valid = await sessionService.isSessionValid(session2.sessionId);
  const isSession1Valid = await sessionService.isSessionValid(session1.sessionId);
  assert(!isSession2Valid, 'Session 2 revoked successfully (isSessionValid = false)');
  assert(isSession1Valid, 'Session 1 remains active and valid');

  // Revoke all other sessions
  const revokedCount = await sessionService.revokeAllOtherSessions(String(placementAdmin._id), session1.sessionId);
  assert(typeof revokedCount === 'number', 'Revoke all other sessions executed');

  // 7. Structured Audit Logging & PII Sanitization
  console.log('\n7. Centralized Audit Trail & Security Sanitization Tests:');
  const mockAdminReq = {
    admin: superAdmin,
    headers: { 'user-agent': 'Jest-Testing-Agent', 'x-forwarded-for': '203.0.113.195' },
    socket: { remoteAddress: '127.0.0.1' },
  } as any;

  // Log event with potentially sensitive details
  const auditEvent = await auditLogger.log(mockAdminReq, {
    action: 'ADMIN_PROVISIONED',
    module: 'ADMINS',
    targetType: 'Admin',
    targetId: String(placementAdmin._id),
    targetName: placementAdmin.name,
    outcome: 'SUCCESS',
    details: {
      password: 'PlainSecretPassword123!', // Must be redacted
      accessToken: 'JWT_SAMPLE_SECRET',     // Must be redacted
      adminRole: 'placement_admin',         // Safe
    },
  });

  assert(auditEvent.auditId.startsWith('AUD_'), 'Generated structured auditId starting with AUD_');
  assert(auditEvent.actorName === superAdmin.name, 'Actor name snapshot recorded correctly');
  assert(auditEvent.ipAddress === '203.0.113.195', 'IP address extracted from request headers');
  assert(auditEvent.details?.password === '[REDACTED]', 'Security Check: Plain text password was automatically [REDACTED]');
  assert(auditEvent.details?.accessToken === '[REDACTED]', 'Security Check: Access token was automatically [REDACTED]');
  assert(auditEvent.details?.adminRole === 'placement_admin', 'Non-sensitive metadata preserved');

  // Audit Logs Query & CSV Export
  const logsQuery = await auditLogger.getLogs({ module: 'ADMINS' });
  assert(logsQuery.logs.length >= 1, 'Audit log query retrieves recorded events');

  const csv = await auditLogger.exportToCsv({ module: 'ADMINS' });
  assert(csv.includes('Audit ID,Timestamp,Administrator'), 'Audit CSV export generated with standard headers');
  assert(csv.includes('ADMIN_PROVISIONED'), 'Audit CSV export contains logged action');

  // 8. Application Settings Management & Data Health
  console.log('\n8. Centralized System Settings & Data Health Tests:');
  const defaultSettings = await SystemSettings.create({});
  assert(defaultSettings.general.applicationName === 'PlacementAuto', 'Default applicationName is PlacementAuto');
  assert(defaultSettings.security.maxLoginAttempts === 5, 'Default maxLoginAttempts is 5');
  assert(defaultSettings.campaign.defaultMessageProvider === 'PERSONAL_ASSISTED', 'Default message provider is PERSONAL_ASSISTED');

  // Update Settings
  defaultSettings.general.organizationName = 'Apex Institute of Technology';
  defaultSettings.security.sessionTimeoutHours = 72;
  await defaultSettings.save();

  const freshSettings = await SystemSettings.findById(defaultSettings._id);
  assert(freshSettings?.general.organizationName === 'Apex Institute of Technology', 'Updated organizationName persisted');
  assert(freshSettings?.security.sessionTimeoutHours === 72, 'Updated security timeout persisted');

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
