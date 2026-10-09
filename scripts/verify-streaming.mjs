// Local-only smoke check: the search API deliberately pauses for three seconds.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const secret = 'local-streaming-fixture-secret-not-production';
const processes = [];
const start = (file, args, env) => { const process = spawn(file, args, { env: { ...globalThis.process.env, ...env }, stdio: 'ignore' }); processes.push(process); return process; };
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const proxy = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/v1/search')) await delay(3000);
    const response = await fetch(`http://127.0.0.1:8097${req.url}`, { headers: req.headers });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(503); res.end(); }
});
try {
  start(process.execPath, ['tests/stub-api/server.mjs'], { PORT: '8097', BFF_SECRET: secret });
  await new Promise(resolve => proxy.listen(8096, '127.0.0.1', resolve));
  start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3102'], { SPACE_API_URL: 'http://127.0.0.1:8096', SPACE_BFF_SECRET: secret, SPACE_SITE_URL: 'http://127.0.0.1:3102', SPACE_DEMO_MODE: 'true' });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await fetch('http://127.0.0.1:3102/manifest.webmanifest'); ready = true; break; } catch { await delay(100); }
  }
  assert.ok(ready, 'local Next server did not start');
  const began = performance.now();
  const response = await fetch('http://127.0.0.1:3102/');
  assert.equal(response.status, 200);
  let html = ''; let shell; let listings;
  for await (const bytes of response.body) {
    html += new TextDecoder().decode(bytes);
    if (!shell && html.includes('hero-title') && html.includes('start-search')) shell = Math.round(performance.now() - began);
    if (!listings && html.includes('Recently listed')) listings = Math.round(performance.now() - began);
  }
  assert.ok(shell && listings && listings - shell >= 2000, 'search UI did not arrive before delayed inventory');
  console.log(JSON.stringify({ shell_ms: shell, listings_ms: listings, artificial_api_delay_ms: 3000 }));
  await new Promise((resolve, reject) => {
    const audit = spawn(process.execPath, ['scripts/a11y-audit.mjs', 'http://127.0.0.1:3102', '/', '/login', '/safety'], { stdio: 'inherit' });
    audit.once('error', reject);
    audit.once('exit', code => code === 0 ? resolve() : reject(new Error(`Structural accessibility check failed: ${code}`)));
  });
} finally {
  for (const process of processes) process.kill('SIGTERM');
  proxy.closeAllConnections(); proxy.close();
}
