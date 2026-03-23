#!/bin/bash
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=./backups/backup_$TIMESTAMP
mkdir -p $BACKUP_DIR
echo Starting backup to $BACKUP_DIR...

if ! command -v supabase &> /dev/null; then
  echo Error: supabase command not found
  exit 1
fi

echo 1. Dumping schema...
supabase db dump --local > $BACKUP_DIR/schema.sql

echo 2. Dumping data...
supabase db dump --local --data-only > $BACKUP_DIR/data.sql

echo 3. Archiving files...
tar --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./backups --exclude=./.turbo --exclude=./.DS_Store -czf $BACKUP_DIR/project_code.tar.gz .

ls -lh $BACKUP_DIR
echo Backup completed.
