// Disposable local fixture runner. Never connects to the configured/live API.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const secret = randomBytes(32).toString('hex');
const env = { ...process.env, SPACE_API_URL: 'http://localhost:8099', SPACE_SITE_URL: 'http://localhost:3100', SPACE_BFF_SECRET: secret, SPACE_DEMO_MODE: 'true', SPACE_PAYMENTS_ENABLED: 'false', E2E_BASE_URL: 'http://localhost:3100' };
const processes = [];
function start(args, overrides = {}) {
  const child = spawn(process.execPath, args, { env: { ...env, ...overrides }, stdio: 'inherit' });
  processes.push(child);
  return child;
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
try {
  start(['tests/stub-api/server.mjs'], { PORT: '8099', BFF_SECRET: secret, DEMO_PHOTOS: 'true', GRACE: '30', ACCESS_TTL: '900' });
  start(['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '-p', '3100']);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch('http://localhost:3100/manifest.webmanifest'); ready = response.ok; if (ready) break; } catch { /* Boot in progress. */ }
    await delay(100);
  }
  if (!ready) throw new Error('Preview server did not start');
  for (const script of process.argv.slice(2)) {
    const child = start([script]);
    const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    if (exit !== 0) throw new Error(`${script} failed (${exit})`);
  }
} finally { for (const child of processes) child.kill('SIGTERM'); }
