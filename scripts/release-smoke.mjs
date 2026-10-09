// Read-only checks after a staging deployment. Never signs in, sends an SMS,
// changes a listing, or touches a production database.
import assert from 'node:assert/strict';
const origin = process.env.SPACE_SMOKE_ORIGIN;
assert.ok(origin && new URL(origin).protocol === 'https:', 'Set SPACE_SMOKE_ORIGIN to the deployed HTTPS origin.');
const paths = ['/', '/login', '/manifest.webmanifest', '/support', '/privacy'];
for (const path of paths) {
  const started=performance.now();const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(60_000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  console.log(`${path}: ${Math.round(performance.now()-started)}ms`);
  if(path==='/manifest.webmanifest'){const manifest=await response.json();assert.equal(manifest.display,'standalone');assert.ok(manifest.icons.length>=2);}
  if(path==='/')assert.ok(response.headers.get('content-security-policy'),'CSP missing');
}
for(const path of ['/account','/inbox','/hosting','/staff/reports']){
 const response=await fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(30_000)});
 assert.ok([302,303,307,308].includes(response.status),`${path}: anonymous private route did not redirect`);
 assert.ok(response.headers.get('location')?.includes('/login'),`${path}: unexpected private redirect`);
 assert.ok(/no-store|private/.test(response.headers.get('cache-control')??''),`${path}: private route permits shared caching`);
 console.log(`${path}: anonymous access denied`);
}
console.log('Read-only deployed smoke checks passed. This does not verify providers, SMS or database restoration.');
