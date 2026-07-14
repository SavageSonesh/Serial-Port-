// Creates a fresh throwaway SQLite database for the test run.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default function setup() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(dir, '..');
  const testDb = path.join(backendDir, 'prisma', 'test.db');
  if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  execSync('npx prisma db push --skip-generate', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
  return () => {
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const f = testDb + suffix;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  };
}
