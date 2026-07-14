// Copies the SQLite database to backend/data/backups/ with a timestamp.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = path.resolve(__dirname, '..', 'prisma', 'dev.db');
const dir = path.resolve(__dirname, '..', 'data', 'backups');

if (!fs.existsSync(db)) {
  console.error('No database found at', db, '— run `npm run setup` first.');
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = path.join(dir, `trendradar-backup-${stamp}.db`);
fs.copyFileSync(db, dest);
console.log('Backup created:', dest, `(${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
