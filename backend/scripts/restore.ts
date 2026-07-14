// Restores the SQLite database from a backup.
// Usage: npm run restore                → restores the most recent backup
//        npm run restore -- <filename>  → restores a specific backup file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = path.resolve(__dirname, '..', 'prisma', 'dev.db');
const dir = path.resolve(__dirname, '..', 'data', 'backups');

const requested = process.argv[2];

if (!fs.existsSync(dir)) {
  console.error('No backups folder found at', dir);
  process.exit(1);
}
const backups = fs.readdirSync(dir).filter((f) => f.endsWith('.db')).sort().reverse();
if (backups.length === 0) {
  console.error('No backups found in', dir);
  process.exit(1);
}

const chosen = requested ? backups.find((b) => b === requested) : backups[0];
if (!chosen) {
  console.error(`Backup "${requested}" not found. Available:\n  ${backups.join('\n  ')}`);
  process.exit(1);
}

fs.copyFileSync(path.join(dir, chosen), db);
for (const suffix of ['-journal', '-wal', '-shm']) {
  if (fs.existsSync(db + suffix)) fs.unlinkSync(db + suffix);
}
console.log('Restored database from', chosen);
console.log('Restart the app (`npm run dev`) to load the restored data.');
