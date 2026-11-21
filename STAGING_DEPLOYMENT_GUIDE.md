# STAGING DEPLOYMENT GUIDE
**Placement Candidate Management & WhatsApp Messaging Automation System**

This guide provides end-to-end instructions for deploying the Placement Candidate Management and WhatsApp Messaging Automation System to an isolated, production-grade staging environment.

---

## 1. Staging Principles & Safety Controls

1. **Database Isolation**: The staging environment **must** connect to a dedicated staging database (e.g., `placement_staging`). Never point staging at production databases.
2. **Fictitious Test Candidates**: Never import real student or candidate data into staging. Use synthetic mock candidate datasets.
3. **WhatsApp Safety**:
   - Keep **Personal WhatsApp Assisted Mode** as the default.
   - Do **NOT** open chats to real external candidates during automated tests.
   - Meta Cloud API should remain in **Test / Mock Mode** (`isMockMode: true`) until explicitly testing verified sandbox credentials with test numbers.
4. **No Secrets in Frontend**: `VITE_API_URL` should point to the relative `/api` or reverse-proxied backend URL. Never prefix API secrets with `VITE_`.
5. **Zero Data Overwriting**: Staging deployments must never drop or overwrite persistent production volumes.

---

## 2. Recommended Hosting Architecture

```
                                  Internet
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │    Reverse Proxy / Cloudflare     │
                   │    (SSL / TLS Termination - HTTPS)│
                   └───────────────┬───────────────────┘
                                   │
              ┌────────────────────┴───────────────────┐
              │                                        │
              ▼                                        ▼
    ┌───────────────────┐                    ┌───────────────────┐
    │ Frontend Host     │                    │ Backend Host      │
    │ (Vercel / Netlify │                    │ (Render / AWS /   │
    │  / Nginx / S3)    │                    │  DigitalOcean)    │
    │                   │                    │ Node.js 18+       │
    │ React 18 SPA      │                    │ Express API       │
    │ Static Assets     │                    │ Port 5000         │
    └─────────┬─────────┘                    └─────────┬─────────┘
              │                                        │
              │  /api (Reverse Proxied or CORS)        │
              └────────────────────────────────────────┤
                                                       │
                                                       ▼
                                            ┌───────────────────┐
                                            │ Database Host     │
                                            │ MongoDB Atlas or  │
                                            │ Dedicated MongoDB │
                                            │ Replica Set (v6+) │
                                            └───────────────────┘
```

### Hosting Options Matrix
| Component | Option A (Containerized / Cloud PaaS) | Option B (Self-Hosted Linux VPS) | Option C (Managed AWS / GCP) |
|---|---|---|---|
| **Frontend** | Vercel / Netlify / Render Static | Nginx serving `client/dist` | AWS S3 + CloudFront |
| **Backend** | Render / Railway / Fly.io | Node.js (PM2) behind Nginx reverse proxy | AWS ECS (Fargate) / App Runner |
| **Database** | MongoDB Atlas (M10+ Staging cluster) | MongoDB Community 7.0 on private network | MongoDB Atlas on AWS PrivateLink |
| **File Storage** | Local persistent volume / AWS S3 | Local storage (`server/uploads/resumes`) | Amazon S3 Bucket (Private) |

---

## 3. Required Environment Variables

Create `server/.env` based on `server/.env.example`:

| Variable Name | Staging Value Example | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express server |
| `NODE_ENV` | `staging` | Runtime environment mode |
| `MONGODB_URI` | `mongodb+srv://staging_user:password@cluster0.mongodb.net/placement_staging?retryWrites=true&w=majority` | Isolated staging MongoDB connection string |
| `CLIENT_URL` | `https://staging-placement.yourinstitution.edu` | Allowed CORS origin (supports comma-separated origins) |
| `JWT_SECRET` | `staging_jwt_super_secret_key_minimum_32_characters_random` | High-entropy secret for signing session tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `COOKIE_SECRET` | `staging_cookie_super_secret_key_minimum_32_chars_random` | Secret for signing secure cookies |
| `ADMIN_NAME` | `Staging Super Admin` | Default admin name for initial bootstrap |
| `ADMIN_EMAIL` | `admin-staging@placement.edu` | Default admin login email |
| `ADMIN_PASSWORD` | `StagingSecure@2026!` | Strong password ($\ge 8$ chars, uppercase, lowercase, number, symbol) |
| `ENCRYPTION_KEY` | `staging_aes256_enc_key_32bytes!!` | 32-character key for AES-256-GCM secret encryption |
| `META_APP_ID` | `""` (leave empty for mock mode) | Meta Developer App ID |
| `META_APP_SECRET` | `""` (leave empty for mock mode) | Meta App Secret |
| `META_WABA_ID` | `""` (leave empty for mock mode) | WhatsApp Business Account ID |
| `META_PHONE_NUMBER_ID` | `""` (leave empty for mock mode) | WhatsApp Business Phone Number ID |
| `META_ACCESS_TOKEN` | `""` (leave empty for mock mode) | System User Permanent Access Token |
| `META_WEBHOOK_VERIFY_TOKEN` | `staging_webhook_verify_token_2026` | Verification token for Meta Webhooks setup |
| `META_GRAPH_VERSION` | `v21.0` | Meta Graph API Version |
| `WEBHOOK_BASE_URL` | `https://api-staging-placement.yourinstitution.edu` | Public URL where Meta sends webhook callbacks |

Frontend environment (`client/.env.production` or staging build environment):
```bash
VITE_API_URL=/api
```
*(Using `/api` with a reverse proxy prevents cross-origin cookie and SameSite restrictions completely).*

---

## 4. Step-by-Step Staging Deployment Instructions

### Step 1: Provision Staging Database
1. Create a dedicated database named `placement_staging` in MongoDB Atlas (or local MongoDB).
2. Create a database user with `readWrite` permissions strictly restricted to `placement_staging`.
3. Whitelist the staging server IP in MongoDB Network Access.

### Step 2: Clone Codebase on Staging Server
```bash
git clone <repository-url> placement-staging
cd placement-staging
```

### Step 3: Configure Environment Variables
```bash
cp server/.env.example server/.env
nano server/.env
```
*(Populate with staging database credentials and secure random secrets).*

### Step 4: Install Dependencies & Build Bundles
```bash
# Install all workspace dependencies
npm run install:all

# Build frontend client
npm --prefix client run build

# Build backend server
npm --prefix server run build
```

### Step 5: Verify Startup & Bootstrap Super Admin
Run a verification start to confirm database connection, system roles seeding, and Super Admin provisioning:
```bash
cd server
NODE_ENV=staging node dist/server.js
```
Expected output:
```
[INFO] MongoDB Connected successfully to host: ...
[INFO] Seeded default system roles (superadmin, placement_admin, placement_executive, viewer)
[SUCCESS] Initial admin account created successfully: admin-staging@placement.edu
[SUCCESS] 🚀 Server running on port 5000 in staging mode
[SUCCESS] 🔗 Health check available at: http://localhost:5000/api/health
```

### Step 6: Process Management with PM2
To keep the backend running reliably in staging with auto-restart:
```bash
npm install -g pm2
pm2 start server/dist/server.js --name "placement-api-staging" --time
pm2 save
pm2 startup
```

### Step 7: Nginx Reverse Proxy Configuration (Recommended)
Configure Nginx to serve the frontend SPA and proxy `/api` requests to Express on port 5000 with HTTPS:

```nginx
server {
    listen 80;
    server_name staging-placement.yourinstitution.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging-placement.yourinstitution.edu;

    ssl_certificate /etc/letsencrypt/live/staging-placement.yourinstitution.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging-placement.yourinstitution.edu/privkey.pem;

    # Frontend Static SPA
    root /var/www/placement-staging/client/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Upload file size limit (matching 20MB limit)
        client_max_body_size 25M;
    }
}
```

---

## 5. Post-Deployment Verification Checklist

Execute these checks immediately following deployment:

1. **Health Check Probe**:
   ```bash
   curl -i https://staging-placement.yourinstitution.edu/api/health
   ```
   Verify HTTP `200 OK` with JSON payload:
   ```json
   {
     "success": true,
     "status": "healthy",
     "database": { "status": "connected" },
     "environment": "staging"
   }
   ```

2. **Super Admin Authentication**:
   - Navigate to `https://staging-placement.yourinstitution.edu/login`.
   - Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
   - Verify that the `accessToken` (HttpOnly) and `csrfToken` cookies are set with `SameSite=Lax; Secure`.

3. **RBAC & Admin Directory**:
   - Open `/admins` and `/roles`. Verify the 4 default system roles are present.
   - Verify that audit logs record the `LOGIN_SUCCESS` event under `/audit-logs`.

4. **Candidate & Company Workflows**:
   - Create a test candidate and upload a sample PDF resume.
   - Download the resume and verify access is authenticated.
   - Create a test company drive and generate an associated virtual group.

5. **Assisted WhatsApp Outreach**:
   - Create a test campaign with 1 candidate.
   - Verify message interpolation.
   - Open the `wa.me` deep link and confirm manual send.

---

## 6. Staging Rollback Procedure

If a staging release fails or introduces regressions:

```bash
# 1. Stop active PM2 process
pm2 stop placement-api-staging

# 2. Revert git checkout to previous verified commit
git checkout <previous-verified-tag-or-commit-sha>

# 3. Rebuild bundles
npm --prefix client run build
npm --prefix server run build

# 4. Restart process
pm2 restart placement-api-staging

# 5. Verify health
curl -f https://staging-placement.yourinstitution.edu/api/health || pm2 logs placement-api-staging
```
