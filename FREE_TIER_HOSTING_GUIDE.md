# 100% FREE HOSTING GUIDE
**Placement Candidate Management & WhatsApp Automation System**

This comprehensive guide walks you through hosting your complete full-stack MERN application for **$0 / month** using industry-standard free cloud tiers:

| Component | Free Platform | What it provides | Cost |
|---|---|---|---|
| **Database** | **MongoDB Atlas** | Managed Cloud Database (M0 Shared Cluster, 512MB storage, automated backups) | **$0 / Forever** |
| **Backend API** | **Render** | Node.js Web Service (512MB RAM, automatic HTTPS, Git CI/CD) | **$0 / Forever** |
| **Frontend UI** | **Vercel** | React 18 Vite SPA (Global Edge CDN, automatic HTTPS, zero-config routing) | **$0 / Forever** |

---

## Architecture of the Free Setup

```
[ Your Users / Browser ]
           │
           ▼ (HTTPS)
┌────────────────────────────────────────┐
│     Vercel (Frontend Web App)          │
│   https://placement-app.vercel.app     │
│   • Global CDN Static Hosting          │
│   • React Router SPA rewrites          │
└──────────────────┬─────────────────────┘
                   │
                   ▼ (HTTPS / API calls)
┌────────────────────────────────────────┐
│     Render (Backend API Service)       │
│   https://placement-api.onrender.com   │
│   • Node.js + Express TypeScript       │
│   • HttpOnly Cookie & Anti-CSRF Auth   │
└──────────────────┬─────────────────────┘
                   │
                   ▼ (Encrypted TLS connection)
┌────────────────────────────────────────┐
│     MongoDB Atlas (Database)           │
│   cluster0.xxxx.mongodb.net            │
│   • 512 MB Free Cloud Replica Set      │
│   • Persistent candidate records       │
└────────────────────────────────────────┘
```

---

## PART 1: Set Up Free Cloud Database (MongoDB Atlas)

### Step 1.1: Create Account & Project
1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Under "Deploy a database", choose **M0 (Free)**.
3. Provider: **AWS**, Region: Pick the region closest to you (e.g. `ap-south-1` Mumbai, `us-east-1` N. Virginia, or `eu-central-1` Frankfurt).
4. Click **Create Deployment**.

### Step 1.2: Create Database User
1. Enter a Username (e.g., `placement_admin`).
2. Generate a secure Password and **copy it down**.
3. Click **Create User**.

### Step 1.3: Configure Network Access (Allow from anywhere)
1. In the "Where would you like to connect from?" prompt, select **Cloud Environment**.
2. Add IP: enter `0.0.0.0/0` (Description: `Allow from anywhere for cloud deployment`).
3. Click **Finish and Close**.

### Step 1.4: Copy Connection String
1. Go to **Database** in the left menu $\rightarrow$ click **Connect**.
2. Choose **Drivers** (Node.js).
3. Copy your connection string. It looks like:
   ```
   mongodb+srv://placement_admin:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
4. Replace `<db_password>` with your real password, and add `/placement_automation` before the `?`:
   ```
   mongodb+srv://placement_admin:YOUR_PASSWORD@cluster0.abcde.mongodb.net/placement_automation?retryWrites=true&w=majority
   ```
   *(Keep this connection string handy for Part 3).*

---

## PART 2: Push Your Code to GitHub (Private Repository)

Both Render and Vercel deploy directly from your GitHub repository automatically.

### Step 2.1: Initialize Git and Commit
Open a terminal in the root folder (`c:\Users\Subod\Desktop\New folder (3)`):

```bash
# 1. Initialize Git repository
git init

# 2. Add all project files (sensitive .env files are protected by .gitignore)
git add .

# 3. Create your initial commit
git commit -m "Production ready placement automation system"
```

### Step 2.2: Push to GitHub
1. Go to [https://github.com/new](https://github.com/new).
2. Name your repository (e.g., `placement-automation-system`).
3. Select **Private** (recommended to keep your code private).
4. Click **Create repository**.
5. Link and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/placement-automation-system.git
   git branch -M main
   git push -u origin main
   ```

---

## PART 3: Deploy Backend API to Render (Free Web Service)

### Step 3.1: Create Web Service
1. Go to [https://render.com](https://render.com) and sign in using your GitHub account.
2. In the dashboard, click **New +** $\rightarrow$ **Web Service**.
3. Choose **Build and deploy from a Git repository** $\rightarrow$ select your `placement-automation-system` repository.

### Step 3.2: Configure Build & Start Settings
Fill in the configuration:
- **Name**: `placement-api` (or custom name)
- **Region**: Same region as your MongoDB Atlas cluster (e.g., Singapore, Frankfurt, or Oregon)
- **Branch**: `main`
- **Root Directory**: `server` *(Important!)*
- **Runtime**: `Node`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Instance Type**: Select **Free** ($0 / month).

### Step 3.3: Set Environment Variables
Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Notes |
|---|---|---|
| `PORT` | `5000` | Server listening port |
| `NODE_ENV` | `production` | Enables production mode & security |
| `MONGODB_URI` | *(Your Atlas connection string from Part 1)* | MongoDB Atlas database URL |
| `CLIENT_URL` | `http://localhost:5173` | *(Temporary: update in Part 5 with your Vercel URL)* |
| `JWT_SECRET` | `pl4c3m3nt_jwt_sup3r_s3cr3t_k3y_2026_x92` | Random 32+ character string |
| `COOKIE_SECRET` | `pl4c3m3nt_c00k13_s3cr3t_k3y_2026_w19` | Random 32+ character string |
| `ENCRYPTION_KEY` | `placement_aes_key_32_bytes_long!` | Exactly 32 characters for AES encryption |
| `ADMIN_NAME` | `Super Administrator` | Default admin display name |
| `ADMIN_EMAIL` | `admin@placement.edu` | Your login email |
| `ADMIN_PASSWORD` | `Admin@123456!` | Strong password ($\ge 8$ chars, uppercase, lowercase, number, symbol) |
| `COOKIE_SAMESITE` | `none` | Allows cross-origin cookies between Vercel and Render |

### Step 3.4: Deploy & Verify
1. Click **Create Web Service**.
2. Render will clone the repo, install packages, compile TypeScript with `tsc`, and start the server.
3. Once the log shows:
   ```
   [SUCCESS] Server running on port 5000 in production mode
   [SUCCESS] Initial admin account created successfully: admin@placement.edu
   ```
4. **Copy your Render Backend URL** from the top of the dashboard (e.g. `https://placement-api-xxxx.onrender.com`).
5. Test your live health endpoint in the browser:
   ```
   https://placement-api-xxxx.onrender.com/api/health
   ```
   You should see:
   ```json
   { "success": true, "status": "healthy", "database": { "status": "connected" } }
   ```

---

## PART 4: Deploy Frontend UI to Vercel (Free)

### Step 4.1: Import Project to Vercel
1. Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select your `placement-automation-system` repository and click **Import**.

### Step 4.2: Configure Project Settings
In the Vercel deployment configuration screen:
1. **Framework Preset**: `Vite` (auto-detected).
2. **Root Directory**: Click **Edit** and set it to **`client`** *(Important!)*.
3. **Build Command**: `npm run build` (auto-configured).
4. **Output Directory**: `dist` (auto-configured).

### Step 4.3: Set Environment Variable
Under **Environment Variables**, add:
- **Key**: `VITE_API_URL`
- **Value**: Your Render Backend URL + `/api`
  *(e.g., `https://placement-api-xxxx.onrender.com/api`)*

### Step 4.4: Deploy
1. Click **Deploy**.
2. In about 45–60 seconds, your frontend will be deployed globally.
3. Click **Continue to Dashboard** and **copy your Vercel URL** (e.g., `https://placement-automation-xxxx.vercel.app`).

---

## PART 5: Connect Frontend & Backend (Final CORS Step)

Now link the two so the backend accepts login cookies from your Vercel URL:

1. Open your **Render Dashboard** $\rightarrow$ click your `placement-api` service.
2. Click **Environment** on the left menu.
3. Find `CLIENT_URL` and update its value to your **Vercel URL**:
   ```
   https://placement-automation-xxxx.vercel.app
   ```
4. Click **Save Changes**.
5. Render will automatically redeploy in 30 seconds.

---

## PART 6: First Login & Verification

1. Open your Vercel frontend URL: `https://placement-automation-xxxx.vercel.app`.
2. You will be redirected to the secure login page (`/login`).
3. Enter your bootstrap credentials:
   - **Email**: `admin@placement.edu` (or whatever you set in `ADMIN_EMAIL`)
   - **Password**: `Admin@123456!` (or whatever you set in `ADMIN_PASSWORD`)
4. Click **Sign In**.
5. **Congratulations!** You are now in the live Production/Staging Admin Console:
   - **Candidates**: Add candidates or bulk upload Excel/CSV rosters.
   - **Companies**: Configure job requirements and eligibility criteria.
   - **Virtual Groups**: Automatic company groups with smart member assignment.
   - **WhatsApp Outreach**: Assisted personal sending with wa.me deep links.
   - **Analytics & Reports**: Real-time MongoDB metrics and Excel/CSV/PDF exports.
   - **Admin Management & RBAC**: Manage team roles and inspect immutable audit logs.

---

## Free Hosting Limitations & Pro-Tips

### Render Free Tier "Spin Down"
- **Behavior**: Free services on Render go to sleep after 15 minutes of inactivity. When someone visits the site after a period of inactivity, the first API request takes ~30 seconds to wake up the server. Subsequent requests are fast.
- **Solution (Optional Free Keep-Alive)**:
  Use a free uptime monitor like [UptimeRobot](https://uptimerobot.com) (free 50 monitors) to ping your health endpoint `https://placement-api-xxxx.onrender.com/api/health` every 10 minutes. This keeps your free Render backend awake 24/7!
