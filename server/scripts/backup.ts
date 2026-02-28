import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const mongoUri = process.env.MONGO_URI_BACKUP || process.env.MONGO_URI || 'mongodb://localhost:27017/zeni';
const mongodumpBin = process.env.MONGODUMP_BIN || 'mongodump';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  ensureDir(backupDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(backupDir, `dump-${stamp}`);

  console.log(`[backup] writing to ${out}`);
  const child = spawn(mongodumpBin, ['--uri', mongoUri, '--out', out], { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error('[backup] failed to start mongodump. Set MONGODUMP_BIN if needed.', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('[backup] done');
      process.exit(0);
    } else {
      console.error(`[backup] mongodump exited with code ${code}`);
      process.exit(code || 1);
    }
  });
}

run();
