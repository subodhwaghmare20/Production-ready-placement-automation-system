# PRODUCTION ENVIRONMENT CHECKLIST
**Placement Candidate Management & WhatsApp Messaging Automation System**

This checklist must be reviewed and signed off prior to promoting the application from staging to production.

---

## 1. Network, SSL & Security Controls

- [ ] **HTTPS Enforced**:
  - All web traffic redirects from HTTP (port 80) to HTTPS (port 443).
  - Modern TLS 1.2 / TLS 1.3 ciphers configured on reverse proxy or load balancer.
- [ ] **Secure Cookie Configuration**:
  - `NODE_ENV=production` set in environment.
  - JWT `accessToken` cookie has `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, and `path: '/'`.
  - CSRF cookie (`csrfToken`) has `httpOnly: false`, `secure: true`, `sameSite: 'lax'`.
- [ ] **CORS Lockdown**:
  - `CLIENT_URL` explicitly configured with exact production frontend domain(s).
  - Wildcard `*` is strictly prohibited in production.
  - Development localhost origins are excluded when `NODE_ENV=production`.
- [ ] **Double-Submit CSRF Protection**:
  - `csrfProtection` middleware active on all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Frontend Axios client sends matching `X-CSRF-Token` header.
  - Meta Webhook routes (`/api/webhooks`) are safely exempted.
- [ ] **Brute-Force Protection Active**:
  - 5 consecutive failed logins trigger a 15-minute HTTP 423 lockout on the targeted account.
  - IP-based rate limiting configured on `/api/auth/*` routes.
- [ ] **Credential Redaction in Logs**:
  - `AuditLoggerService` masks `password`, `token`, `secret`, `jwt`, and `key` with `[REDACTED]`.
  - Application console logs contain zero unmasked secrets.

---

## 2. File Upload & Storage Security

- [ ] **Strict MIME Type & Extension Filtering**:
  - Resumes restricted to `.pdf`, `.doc`, `.docx` (`application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
  - Spreadsheets restricted to `.xlsx`, `.xls`, `.csv`.
  - Executable formats (`.exe`, `.sh`, `.bat`, `.php`, `.js`) strictly blocked.
- [ ] **File Size Enforcement**:
  - Resume uploads capped at 10 MB in Multer.
  - Bulk spreadsheets capped at 20 MB.
  - Reverse proxy (`client_max_body_size`) aligned to 25 MB.
- [ ] **Non-Public Storage Directory**:
  - Resume upload directory (`server/uploads/resumes`) is **not** served statically by Express.
  - Direct URL access to files is blocked; access is mediated through `GET /api/candidates/:id/resume` with `authMiddleware` session checks.
- [ ] **Git Exclusion**:
  - `.gitignore` includes `uploads/`, `server/uploads/`, and raw document extensions (`*.pdf`, `*.docx`, `*.xlsx`).

---

## 3. Database Architecture & Indexing

- [ ] **Dedicated Production Database**:
  - MongoDB connection string points to a multi-node production replica set (e.g. MongoDB Atlas M10+).
  - Production database user possesses minimum necessary privileges.
- [ ] **Fail-Fast Database Startup**:
  - Backend server exits with code `1` if unable to connect to MongoDB in production (no fallback to in-memory databases).
- [ ] **Verified Unique Constraints & Indexes**:
  - `Candidate`: unique index on `candidateId` and `normalizedPhoneNumber`.
  - `Company`: unique index on `companyId`.
  - `VirtualGroup`: unique index on `companyId` (one group per company).
  - `GroupMembership`: compound unique index on `{ groupId: 1, candidateId: 1 }`.
  - `CampaignRecipient`: compound unique index on `{ campaignId: 1, candidateId: 1 }`.
  - `CampaignRecipient`: sparse index on `providerMessageId` for webhook lookup.
  - `WhatsAppSuppression`: unique index on `normalizedPhoneNumber`.
  - `AuditLog`: immutable index on `{ createdAt: -1 }`.
- [ ] **Pre-Seeded System Roles**:
  - `permissionService.seedDefaultRoles()` runs on initial connection, establishing `superadmin`, `placement_admin`, `placement_executive`, and `viewer`.
  - Super Admin role locked with wildcard `*`.
- [ ] **Safe Deletion & Historical Integrity**:
  - Candidate group removal retains historical membership with `membershipStatus: 'Removed'`.
  - Audit log entries are strictly append-only (no delete/update endpoints).

---

## 4. WhatsApp Compliance & Messaging Safeguards

- [ ] **Default to Personal WhatsApp Assisted Mode**:
  - Default message provider set to `PERSONAL_ASSISTED`.
  - Outreach links use standard `https://wa.me/<number>?text=<encoded_text>`.
  - Zero browser DOM scraping or automated personal account bulk blasting.
- [ ] **Opt-Out & Consent Verification**:
  - Candidate consent (`whatsappConsent: true`) verified before preparing campaign batches.
  - Opted-out numbers registered in `WhatsAppSuppression` automatically excluded.
- [ ] **Cloud API Separation**:
  - Personal manual confirmation (`SENT_MANUALLY_CONFIRMED`) maintained strictly separate from Cloud API verified delivery (`DELIVERED`, `READ`).
  - Meta Cloud API credentials encrypted with AES-256-GCM.
  - Webhook signatures verified using `x-hub-signature-256` HMAC-SHA256 with Meta App Secret.

---

## 5. Monitoring, Health Checks & Diagnostics

- [ ] **Health Endpoint Operational**:
  - `GET /api/health` returns `200 OK` when healthy and `503 Service Unavailable` if MongoDB disconnects.
  - Liveness probe configured on container orchestrator / monitoring service.
- [ ] **Error Sanitization**:
  - Internal server errors return generic `{ "success": false, "message": "Internal Server Error" }` without stack traces to clients.
- [ ] **Audit Trail Dashboard**:
  - Super Admins can review all security events, role changes, and admin activities under `/audit-logs`.
  - CSV export capability verified for institutional compliance audits.

---

## Sign-Off Matrix

| Reviewer Role | Name | Date | Status |
|---|---|---|---|
| **Lead Architect** | | | [ ] Approved |
| **Security Engineer** | | | [ ] Approved |
| **Database Administrator** | | | [ ] Approved |
| **QA / Testing Lead** | | | [ ] Approved |
| **Placement Cell Director**| | | [ ] Approved |
