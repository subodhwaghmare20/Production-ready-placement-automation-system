# Placement Candidate Management & WhatsApp Messaging Automation System

An enterprise-ready full-stack application designed for college and university placement cells. It centralizes candidate records, company placement drives, company-specific virtual groups, personal WhatsApp assisted outreach, and official Meta WhatsApp Business Cloud API integration.

---

## 1. System Overview & Module Status

- **MODULE 1**: Project Initialization & Core Architecture (**Completed & Verified**)
- **MODULE 2**: Authentication & Admin Dashboard (**Completed & Verified**)
- **MODULE 3**: Candidate Management System (**Completed & Verified**)
- **MODULE 4**: Company Management System (**Completed & Verified**)
- **MODULE 5**: Virtual WhatsApp Group Management System (**Completed & Verified**)
- **MODULE 6**: Contact Fetcher & Candidate Assignment Engine (**Completed & Verified**)
- **MODULE 7**: WhatsApp Messaging Engine — Personal WhatsApp Assisted Mode (**Completed & Verified**)
- **MODULE 8**: Advanced Message Templates & Candidate Personalization (**Completed & Verified**)
- **MODULE 9**: Campaign Tracking, Real-Time Analytics & Report Exports (**Completed & Verified**)
- **MODULE 10**: Official WhatsApp Business Cloud API & Webhooks (**Completed & Verified**)
- **MODULE 11**: Admin Settings, Immutable Audit Trail, Roles & RBAC (**Completed & Verified**)
- **FULL SYSTEM INTEGRATION**: Master End-to-End Audit across all 11 modules (**47/47 Tests Passed**)

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v6) with Public & Protected Routes
- **HTTP Client**: Axios with HttpOnly cookie credentials and Anti-CSRF header interceptor
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT stored in secure `HttpOnly` cookie + Double-submit Anti-CSRF protection
- **Cryptography**: AES-256-GCM authenticated encryption for API secrets; Bcrypt for passwords
- **File Handling**: `multer` handling PDF, DOC, DOCX resumes and bulk spreadsheets
- **Reporting**: `xlsx` (Excel, CSV) and custom vector PDF generation

---

## 3. High-Level Architectural Flow

```
                      ┌─────────────────────────────────────────┐
                      │    React 18 Single Page Application     │
                      │  Admin Console & Role-Based Navigation  │
                      └────────────────────┬────────────────────┘
                                           │ Axios + HttpOnly Cookie + CSRF
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │       Express + TypeScript REST API     │
                      │ ─────────────────────────────────────── │
                      │  • Auth & Session Revocation Layer      │
                      │  • RBAC & Permission Middleware         │
                      │  • Rate Limiting & Brute Force Defense  │
                      │  • Append-Only Audit Logger             │
                      └───────┬─────────────────────────┬───────┘
                              │                         │
            ┌─────────────────┴────────┐       ┌────────┴────────────────┐
            ▼                          ▼       ▼                         ▼
┌──────────────────────┐  ┌──────────────────┐ ┌───────────────────────────────┐
│ Personal WhatsApp    │  │ Official Meta    │ │ MongoDB Database              │
│ Assisted Dispatch    │  │ Cloud API & Hooks│ │ ───────────────────────────── │
│ • wa.me Deep Links   │  │ • Graph API v21  │ │ • Candidates & Companies      │
│ • Manual Confirmation│  │ • Anti-Downgrade │ │ • Virtual Groups & Memberships│
│ • No DOM Scraping    │  │ • Opt-Out Stop   │ │ • Campaigns & Recipient Queues│
└──────────────────────┘  └──────────────────┘ │ • Append-Only Audit Trail     │
                                               │ • RBAC Roles & System Settings│
                                               └───────────────────────────────┘
```

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally at `mongodb://localhost:27017/placement_automation` (or fallback in-memory server is used automatically for dev/tests)

### Step 1: Install Dependencies
```bash
npm run install:all
```

### Step 2: Configure Environment
Copy `.env.example` to `server/.env` and adjust settings:
```bash
cp server/.env.example server/.env
```

### Step 3: Run Development Servers
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 5. Automated Testing

Run the Master Full System Integration Suite covering all 11 modules end-to-end:
```bash
cd server && npx ts-node test-full-system-integration.ts
```

Individual module test suites:
```bash
# Modules 1 & 2: Authentication & Core Architecture
cd server && npx ts-node test-suite.ts

# Module 3: Candidate Management System
cd server && npx ts-node test-candidates.ts

# Module 4: Company Management System
cd server && npx ts-node test-companies.ts

# Module 5: Virtual Group & Recipient Resolution
cd server && npx ts-node test-groups.ts

# Module 6: Contact Fetcher & Smart Assignment Engine
cd server && npx ts-node test-contact-fetcher.ts

# Module 7: WhatsApp Messaging Engine (Personal Assisted)
cd server && npx ts-node test-whatsapp-campaigns.ts

# Module 8: Advanced Message Templates & Personalization
cd server && npx ts-node test-advanced-templates.ts

# Module 9: Campaign Tracking, Analytics & Reports
cd server && npx ts-node test-campaign-analytics.ts

# Module 10: Official WhatsApp Cloud API & Webhooks
cd server && npx ts-node test-cloud-api.ts

# Module 11: Admin Settings, Audit Logs, Roles & Permissions
cd server && npx ts-node test-admin-settings.ts
```

---

## 6. Production Build & Deployment

### Production Builds
```bash
# Build Client Production Bundle
npm --prefix client run build

# Build Backend Production Bundle
npm --prefix server run build
```

### Starting in Production
```bash
cd server && npm start
```

### Database Backup & Recovery Procedure
```bash
# Backup MongoDB Database
mongodump --db placement_automation --out ./backups/$(date +%F)

# Restore MongoDB Database
mongorestore --db placement_automation ./backups/2026-11-21/placement_automation
```

---

## 7. Security Best Practices
- Passwords hashed using `bcryptjs` with salt rounds $\ge 10$.
- Secrets and tokens encrypted with `AES-256-GCM` before persistence.
- Sensitive audit details automatically sanitized with `[REDACTED]`.
- Non-superadmins strictly prevented from privilege escalation or granting Super Admin roles.
- Brute force protection triggers an HTTP 423 lockout after 5 consecutive failed logins.
- All sessions support instant revocation individually or globally via `tokenVersion`.
