#!/bin/sh
# Mongo backup script for Zeni. Run daily via cron; retain 30 days.
# Usage: ./backup-mongo.sh [output_dir]
# Requires: MONGO_URI in env or .env

set -e
OUT_DIR="${1:-./backups}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/zeni}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
DUMP_DIR="$OUT_DIR/zeni-$STAMP"
echo "[backup] Dumping to $DUMP_DIR"
mongodump --uri="$MONGO_URI" --out="$DUMP_DIR"
echo "[backup] Done. Pruning backups older than $RETENTION_DAYS days..."
find "$OUT_DIR" -maxdepth 1 -type d -name "zeni-*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;
echo "[backup] Complete."
