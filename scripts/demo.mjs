import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const secret = crypto.randomBytes(32).toString('hex');
const env = { ...process.env, SPACE_API_URL: 'http://localhost:8099', SPACE_SITE_URL: 'http://localhost:3100', SPACE_BFF_SECRET: secret, SPACE_DEMO_MODE: 'true', SPACE_PAYMENTS_ENABLED: 'false' };
console.log('Findaspace local preview: http://localhost:3100\nFictional listings. Test OTP: 123456. Do not deploy the test API.');
const api = spawn(process.execPath, ['tests/stub-api/server.mjs'], { env: { ...env, PORT: '8099', BFF_SECRET: secret, ACCESS_TTL: '900', GRACE: '30', DEMO_PHOTOS: 'true' }, stdio: 'inherit' });
const web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', '3100'], { env, stdio: 'inherit' });
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; api.kill(); web.kill(); process.exitCode = code; }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
api.on('exit', (code) => stop(code ?? 1)); web.on('exit', (code) => stop(code ?? 1));
