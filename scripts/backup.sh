#!/bin/bash
set -euo pipefail

# TimeTask Database Backup Script
# Used by docker-compose backup service

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="${BACKUP_DIR}/timetask_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

echo "[$(date)] Starting database backup..."

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Create compressed backup
pg_dump -U "${PGUSER}" -h "${PGHOST}" "${PGDATABASE}" | gzip > "${BACKUP_FILE}"

# Verify backup was created
if [ -f "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[$(date)] Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "[$(date)] ERROR: Backup file was not created!"
  exit 1
fi

# Cleanup old backups
DELETED=$(find "${BACKUP_DIR}" -name "timetask_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  echo "[$(date)] Cleaned up ${DELETED} old backup(s) (older than ${RETENTION_DAYS} days)"
fi

echo "[$(date)] Backup process finished successfully"
