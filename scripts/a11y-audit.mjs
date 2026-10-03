// Runs axe-core, the standard accessibility engine, over the HTML each page
// serves, and fails on serious or critical problems.
//
//   node scripts/a11y-audit.mjs http://localhost:3000 / /s/some-listing /login
//   A11Y_COOKIE="fs_at=..." node scripts/a11y-audit.mjs http://localhost:3000 /inbox /hosting
//
// It audits the server-rendered page without running its scripts, which
// covers structure: labels, names, alt text, landmarks, heading order, ARIA.
// Colour contrast is left out on purpose: jsdom does not apply stylesheets, so
// axe cannot see the real colours. Contrast is covered where it is decided,
// in the token pairings documented in globals.css.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const [base, ...paths] = process.argv.slice(2);
if (!base || paths.length === 0) {
  console.error('usage: node scripts/a11y-audit.mjs <base-url> <path> [path...]');
  process.exit(2);
}

const headers = process.env.A11Y_COOKIE ? { cookie: process.env.A11Y_COOKIE } : {};
let failed = false;

for (const path of paths) {
  const url = new URL(path, base).toString();
  const html = await (await fetch(url, { headers })).text();
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(axeSource);

  const result = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
  });

  const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const minor = result.violations.filter((v) => !serious.includes(v));
  console.log(`${serious.length ? 'FAIL' : 'ok  '}  ${path}  (${result.passes.length} checks passed, ${serious.length} serious, ${minor.length} minor)`);
  for (const v of result.violations) {
    console.log(`        ${v.impact}: ${v.id}: ${v.help}`);
    for (const node of v.nodes.slice(0, 3)) console.log(`          at ${node.target.join(' ')}`);
  }
  if (serious.length) failed = true;
  dom.window.close();
}

process.exit(failed ? 1 : 0);
