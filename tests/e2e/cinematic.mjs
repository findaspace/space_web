import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
const out = 'artifacts/cinematic';
await mkdir(out, { recursive: true });
const checks = [];
const errors = [];
function check(name, value) { assert.ok(value, name); checks.push(name); console.log(`PASS ${name}`); }
async function loadPhotographs(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .8) { window.scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}
async function audit(page, label) {
  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.filter(v => ['serious', 'critical'].includes(v.impact)));
  assert.deepEqual(violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], label);
  checks.push(`${label}: WCAG audit including contrast`);
}
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const films = [];
    page.on('request', request => { if (request.url().endsWith('.mp4')) films.push(request.url()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    check(`Home ${width}px fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`Reduced motion ${width}px does not fetch video`, films.length === 0);
    check(`Poster ${width}px loads`, await page.locator('.cinema-poster').evaluate(img => img.complete && img.naturalWidth > 0));
    if (width === 390) {
      check('Mobile search is above bottom navigation', await page.locator('input[name=q]:visible').first().evaluate(el => el.getBoundingClientRect().bottom < document.querySelector('nav[aria-label="Main"]').getBoundingClientRect().top));
      check('Only mobile poster is fetched', await page.locator('.cinema-poster').evaluate(img => img.currentSrc.endsWith('hero-mobile.jpg')));
    }
    if ([390, 1440].includes(width)) {
      await loadPhotographs(page);
      await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${out}/hero-${width}.png` });
      await audit(page, `Home ${width}px`);
      for (const [path, name] of [['/login', 'login'], ['/s/listing-02', 'listing'], ['/?group=workspaces', 'search']]) {
        await page.goto(base + path, { waitUntil: 'networkidle' });
        await loadPhotographs(page);
        await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
        check(`${name} ${width}px fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await audit(page, `${name} ${width}px`);
      }
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('video').paused);
  check('Mobile uses the smaller video', await page.locator('video').evaluate(video => video.currentSrc.endsWith('hero-mobile.mp4')));
  await page.getByRole('button', { name: 'Pause background video' }).click();
  check('Pause control stops video', await page.locator('video').evaluate(video => video.paused));
  await page.locator('.space-stories').scrollIntoViewIfNeeded();
  await page.locator('.cinematic-hero').scrollIntoViewIfNeeded();
  check('User pause survives scrolling away and back', await page.locator('video').evaluate(video => video.paused));
  await page.getByRole('button', { name: 'Play background video' }).click();
  await page.waitForFunction(() => !document.querySelector('video').paused);
  await page.locator('.owner-invitation').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('video').paused);
  check('Off-screen video pauses', true);
  await context.close();

  const saving = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await saving.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  const savingPage = await saving.newPage();
  const fetched = [];
  savingPage.on('request', r => { if (r.url().endsWith('.mp4')) fetched.push(r.url()); });
  await savingPage.goto(base, { waitUntil: 'networkidle' });
  check('Data saving does not fetch video', fetched.length === 0);
  await saving.close();

  const blocked = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blocked.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked', 'NotAllowedError')); });
  const blockedPage = await blocked.newPage();
  blockedPage.on('pageerror', error => errors.push(error.message));
  await blockedPage.goto(base, { waitUntil: 'networkidle' });
  check('Blocked autoplay keeps poster and search usable', await blockedPage.locator('.cinema-poster').isVisible() && await blockedPage.getByRole('button', { name: 'Play background video' }).isVisible());
  await blocked.close();
  check('No browser runtime errors', errors.length === 0);
  await writeFile(`${out}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
