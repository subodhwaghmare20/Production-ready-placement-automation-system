# DATABASE BACKUP & DISASTER RECOVERY RUNBOOK
**Placement Candidate Management & WhatsApp Messaging Automation System**

This runbook outlines procedures for automated backups, archive encryption, integrity testing, point-in-time restoration, and complete disaster recovery for both MongoDB data and uploaded candidate resume files.

---

## 1. Backup Strategy Overview

A robust placement system backup requires two synchronized components:
1. **MongoDB Database Collections**: Candidates, Companies, Virtual Groups, Memberships, Templates, Campaigns, Audit Logs, Settings.
2. **File Storage Assets**: Uploaded candidate resumes (`server/uploads/resumes/`).

| Backup Type | Frequency | Retention Schedule | Storage Target |
|---|---|---|---|
| **Daily Differential / Snapshot** | Every 24 hours (02:00 UTC) | Retain 14 days | Encrypted Remote Storage (S3 / B2) |
| **Weekly Full Archive** | Every Sunday | Retain 8 weeks | Secondary Cloud Region |
| **Monthly Archive** | 1st of each month | Retain 12 months | Cold Storage / Glacier |
| **Pre-Deployment Snapshot** | Before every production release | Retain 30 days | Local & Cloud Backup |

---

## 2. Automated Backup Script (`backup-placement.sh`)

Place this script on the database or backend host:

```bash
#!/bin/bash
# ==============================================================================
# Automated Backup Script for Placement Automation System
# ==============================================================================
set -euo pipefail

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/placement_automation"
DB_NAME="${DB_NAME:-placement_automation}"
MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/placement_automation}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/www/placement-automation/server/uploads/resumes}"
ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_KEY:-replace_with_secure_passphrase}"

TARGET_DIR="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "${TARGET_DIR}"

echo "[INFO] Starting backup at $(date) for database: ${DB_NAME}..."

# 1. Dump MongoDB Database with Gzip Compression
mongodump \
  --uri="${MONGO_URI}" \
  --archive="${TARGET_DIR}/${DB_NAME}_${TIMESTAMP}.archive.gz" \
  --gzip

# 2. Archive Uploaded Candidate Resumes
if [ -d "${UPLOADS_DIR}" ]; then
  tar -czf "${TARGET_DIR}/resumes_${TIMESTAMP}.tar.gz" -C "$(dirname "${UPLOADS_DIR}")" resumes
  echo "[INFO] Candidate resume assets archived."
fi

# 3. Create Combined Encrypted Tarball (AES-256-CBC)
COMBINED_ARCHIVE="${BACKUP_DIR}/placement_backup_${TIMESTAMP}.tar.gz.enc"
tar -cf - -C "${TARGET_DIR}" . | openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${ENCRYPTION_PASSPHRASE}" -out "${COMBINED_ARCHIVE}"

# Clean temporary unencrypted folder
rm -rf "${TARGET_DIR}"

echo "[SUCCESS] Encrypted backup created: ${COMBINED_ARCHIVE} ($(du -h "${COMBINED_ARCHIVE}" | cut -f1))"

# 4. Optional: Sync to Cloud Storage (AWS S3)
if command -v aws &> /dev/null; then
  aws s3 cp "${COMBINED_ARCHIVE}" "s3://your-institution-placement-backups/${TIMESTAMP}/"
  echo "[INFO] Backup synced to Amazon S3."
fi

# 5. Clean Backups Older than 14 Days
find "${BACKUP_DIR}" -name "placement_backup_*.tar.gz.enc" -mtime +14 -exec rm -f {} \;
echo "[INFO] Retention policy applied (purged archives older than 14 days)."
```

### Scheduling with Crontab
```bash
# Run daily at 2:00 AM
0 2 * * * /usr/local/bin/backup-placement.sh >> /var/log/placement_backup.log 2>&1
```

---

## 3. Database Restoration & Recovery Procedure

### Scenario A: Restoring to Existing Running MongoDB Instance

Use this procedure to restore data following accidental deletion or corrupted records:

```bash
# 1. Decrypt Backup Archive
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /var/backups/placement_automation/placement_backup_20261121_020000.tar.gz.enc \
  -pass pass:"your_encryption_passphrase" | tar -xzf - -C /tmp/restore_staging/

# 2. Restore MongoDB Database (with --drop to replace existing state cleanly)
mongorestore \
  --uri="mongodb://localhost:27017/placement_automation" \
  --archive="/tmp/restore_staging/placement_automation_20261121_020000.archive.gz" \
  --gzip \
  --drop

# 3. Restore Uploaded Resumes
tar -xzf /tmp/restore_staging/resumes_20261121_020000.tar.gz -C /var/www/placement-automation/server/uploads/

# 4. Clean Temporary Restore Directory
rm -rf /tmp/restore_staging/

echo "[SUCCESS] Database and resume assets restored successfully."
```

---

### Scenario B: Complete Disaster Recovery to Fresh Server / Atlas Cluster

If the primary database server suffers hardware failure or complete loss:

1. **Provision Fresh MongoDB Instance / Atlas Cluster**:
   - Establish new cluster URI: `mongodb+srv://admin_user:password@new-cluster.mongodb.net/placement_automation`.
2. **Download Encrypted Archive from Cloud Storage**:
   ```bash
   aws s3 cp s3://your-institution-placement-backups/latest/backup.tar.gz.enc /var/backups/restore.tar.gz.enc
   ```
3. **Decrypt Archive**:
   ```bash
   mkdir -p /tmp/dr_restore
   openssl enc -d -aes-256-cbc -pbkdf2 \
     -in /var/backups/restore.tar.gz.enc \
     -pass pass:"your_encryption_passphrase" | tar -xzf - -C /tmp/dr_restore/
   ```
4. **Execute Parallel Fast Restore**:
   ```bash
   mongorestore \
     --uri="mongodb+srv://admin_user:password@new-cluster.mongodb.net/placement_automation" \
     --archive="/tmp/dr_restore/placement_automation_*.archive.gz" \
     --gzip \
     --numParallelCollections=4
   ```
5. **Restore Resumes & Set Permissions**:
   ```bash
   mkdir -p /var/www/placement-automation/server/uploads/resumes
   tar -xzf /tmp/dr_restore/resumes_*.tar.gz -C /var/www/placement-automation/server/uploads/
   chown -R nodejs:nodejs /var/www/placement-automation/server/uploads/
   chmod -R 750 /var/www/placement-automation/server/uploads/
   ```
6. **Update Backend `.env`**:
   Update `MONGODB_URI` in `server/.env` with the new cluster connection string.
7. **Restart Application & Run Health Check**:
   ```bash
   pm2 restart placement-api
   curl -f http://localhost:5000/api/health
   ```

---

## 4. Backup Verification & Dry-Run Script

Run monthly to verify that backups are restorable and uncorrupted:

```bash
#!/bin/bash
# Test restoration into an isolated temporary database
set -e

TEMP_DB="placement_backup_verification_test"
TEST_URI="mongodb://localhost:27017/${TEMP_DB}"

echo "[INFO] Running dry-run verification against temporary database: ${TEMP_DB}..."

mongorestore \
  --uri="${TEST_URI}" \
  --archive="/var/backups/placement_automation/latest.archive.gz" \
  --gzip \
  --drop

# Run verification query: count candidates
CANDIDATE_COUNT=$(mongosh "${TEST_URI}" --quiet --eval "db.candidates.countDocuments()")
echo "[PASS] Verified restorable archive: Found ${CANDIDATE_COUNT} candidates."

# Drop test database
mongosh "${TEST_URI}" --quiet --eval "db.dropDatabase()"
echo "[SUCCESS] Verification complete. Temporary database dropped."
```
