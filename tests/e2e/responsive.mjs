import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const binary = process.env.BROWSER_EXECUTABLE_PATH;
const browser = await chromium.launch({ headless: true, ...(binary ? { executablePath: binary, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] } : {}) });
const out = 'artifacts/qa';
await mkdir(out, { recursive: true });
const results = [];
const errors = [];
function check(name, valid) { assert.ok(valid, name); results.push(name); console.log(`PASS ${name}`); }
async function navigate(page, path) { const response = await page.goto(base + path, { waitUntil: 'networkidle' }); assert.ok(response && response.status() < 500, `${path} returned a server error`); }
async function fit(page, label) { check(`${label}: no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
async function audit(page, label) {
  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })));
  assert.deepEqual(violations, [], `${label} accessibility: ${JSON.stringify(violations)}`); results.push(`${label}: accessibility incl. contrast`);
}
async function login(page, phone, next = '/account') {
  await navigate(page, `/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Phone number', { exact: true }).fill(phone);
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL(base + next);
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await navigate(page, '/');
    await fit(page, `Home ${width}px`);
    check(`Home ${width}px: listing photographs loaded`, await page.locator('article img').first().evaluate((img) => img.complete && img.naturalWidth > 0));
    if ([390, 1440].includes(width)) { await page.screenshot({ path: `${out}/home-viewport-${width}.png` }); await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true }); await audit(page, `Home ${width}px`); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page, '/');
  const first = page.locator('article').first();
  const title = await first.locator('h3').innerText();
  await first.getByRole('button', { name: /^Save / }).click();
  await navigate(page, '/saved');
  check('Saved space appears without login', await page.getByRole('heading', { name: title, exact: true }).isVisible());
  await page.reload({ waitUntil: 'networkidle' });
  check('Saved spaces survive reload', await page.locator('article').count() === 1);
  await page.locator('article').getByRole('button', { name: /^Unsave / }).click();
  check('Removing a favourite shows the empty state', await page.getByRole('heading', { name: 'Your next space starts here' }).isVisible());
  await audit(page, 'Saved mobile');

  await navigate(page, '/');
  await page.getByRole('button', { name: /^Search filters/ }).click();
  const filters = page.getByRole('dialog', { name: 'Find your space' });
  await filters.getByLabel('Where?', { exact: true }).fill('Madina');
  await filters.getByLabel('What kind of space?').selectOption('room');
  await filters.locator('select[name=mode]').selectOption('monthly');
  await filters.getByLabel('Maximum listed price').fill('10000');
  await audit(page, 'Mobile search sheet');
  await filters.getByRole('button', { name: 'Search spaces' }).click();
  await page.waitForURL(/q=Madina.*type=room/);
  check('Mobile filters submit a shareable search', page.url().includes('mode=monthly') && page.url().includes('max=10000'));
  await fit(page, 'Filtered results mobile');
  await page.screenshot({ path: `${out}/results-mobile.png`, fullPage: true });
  await navigate(page, '/?group=workspaces');
  check('Workspace group only includes workspace types', await page.locator('article').count() > 0 && await page.locator('article h3').allTextContents().then((texts) => texts.every((t) => /workspace|shop/i.test(t))));
  await navigate(page, '/?sort=newest');
  const before = await page.locator('article').count();
  await page.getByRole('link', { name: 'Show more', exact: true }).click();
  await page.waitForFunction((count) => document.querySelectorAll('article').length > count, before);
  check('Show more appends another page', await page.locator('article').count() > before);
  await navigate(page, '/?q=nonexistent-place-zzzz');
  check('No-match search has a recovery action', await page.getByRole('link', { name: 'Clear filters' }).isVisible());

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await navigate(page, '/s/listing-02');
    await fit(page, `Listing ${width}px`);
    if ([390, 1440].includes(width)) { await audit(page, `Listing ${width}px`); await page.screenshot({ path: `${out}/listing-${width}.png`, fullPage: true }); }
  }
  await page.getByRole('button', { name: /Show all \d+ photos/ }).click();
  const gallery = page.getByRole('dialog');
  check('Full gallery opens', await gallery.isVisible());
  await page.keyboard.press('ArrowRight');
  check('Gallery supports keyboard photo navigation', await gallery.getByText('2 of 5', { exact: true }).isVisible());
  await page.keyboard.press('Escape');
  check('Escape closes photo gallery', !(await gallery.isVisible()));
  check('Contact number remains hidden before login', !(await page.locator('a[href="tel:+233244999000"]').count()));
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, '0244777333', '/s/listing-02');
  await page.getByRole('button', { name: 'Show number', exact: true }).click();
  await page.getByRole('link', { name: 'WhatsApp', exact: true }).waitFor();
  check('Phone sign-in and reveal enable call and WhatsApp', await page.locator('a[href^="tel:"]').count() > 0 && await page.locator('a[href^="https://wa.me/"]').count() > 0);
  await navigate(page, '/message/listing-02');
  await page.getByRole('button', { name: 'Is it still available?', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.waitForURL(/\/inbox\//);
  check('A renter can start a listing conversation', await page.getByText('Is it still available?', { exact: true }).last().isVisible());
  await fit(page, 'Conversation mobile');

  await navigate(page, '/post');
  await page.locator('input[type="file"]').setInputFiles(['tests/stub-api/photos/0.jpg', 'tests/stub-api/photos/1.jpg']);
  await page.getByRole('button', { name: 'Make cover', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Self contained', exact: true }).click();
  await page.getByRole('button', { name: 'Monthly', exact: true }).click();
  await page.getByLabel('Listing title, optional').fill('My bright space in Madina');
  await page.getByLabel('About your space, optional').fill('A quiet space with a private bathroom and reliable water.');
  await page.getByRole('button', { name: 'Enter map coordinates instead' }).click();
  await page.getByLabel('Latitude', { exact: true }).fill('5.6825');
  await page.getByLabel('Longitude', { exact: true }).fill('-0.1675');
  await page.getByRole('button', { name: 'Use these coordinates' }).click();
  await page.getByLabel('Area', { exact: true }).fill('Madina');
  await page.getByLabel('GhanaPostGPS digital address, optional').fill('GA-123-4567');
  await page.getByLabel('Price per month').fill('1200');
  await page.getByLabel('I own this space').check();
  await fit(page, 'Post details mobile');
  await page.screenshot({ path: `${out}/post-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Post it', exact: true }).click();
  await page.getByRole('button', { name: 'Send for review', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Send for review' && !b.disabled));
  await page.getByRole('button', { name: 'Send for review', exact: true }).click();
  await page.getByRole('heading', { name: 'Sent for review', exact: true }).waitFor();
  check('Host can create, upload and submit a listing from a phone', true);
  await page.getByRole('link', { name: 'See my listings' }).click();
  await page.getByRole('link', { name: 'Manage listing', exact: true }).first().click();
  await page.getByLabel('Bedrooms', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Save details', exact: true }).click();
  await page.getByText('Your listing details have been saved.', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  check('Host attribute edits persist through the API', await page.getByLabel('Bedrooms', { exact: true }).inputValue() === '2');
  await fit(page, 'Host manager mobile');
  await audit(page, 'Host manager mobile');
  for (const path of ['/book/listing-02', '/bookings', '/hosting/payouts']) {
    const response = await page.goto(base + path); check(`Payment surface disabled: ${path}`, response.status() === 404);
  }
  await navigate(page, '/account');
  await audit(page, 'Account mobile');
  await fit(page, 'Account mobile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(base + '/');
  await navigate(page, '/hosting');
  check('Protected host routes redirect after logout', page.url().includes('/login'));
  check('No browser runtime errors', errors.length === 0);
  await writeFile(`${out}/browser-results.json`, JSON.stringify({ checks: results, runtimeErrors: errors }, null, 2));
  await rm(`${out}/failure.json`, { force: true });
  await context.close();
} catch (error) { console.error(error); await writeFile(`${out}/failure.json`, JSON.stringify({ checks: results, runtimeErrors: errors, error: String(error) }, null, 2)); throw error; } finally { await browser.close(); }
