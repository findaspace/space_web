// Fails the build when a page ships too much JavaScript up front, or when the
// map engine leaks into what any page loads before it is needed.
//
// It reads the build output rather than running the app, so it needs no API
// and runs in CI straight after `next build`. For each route it adds up what a
// browser fetches before the page can respond: the framework's own files, plus
// every chunk the route's layouts and page declare. Chunks loaded later with
// import(), like the map engine, are not counted, which is the point.
//
// Budgets are compressed sizes, since that is what crosses a phone's data
// connection. They sit a little above today's numbers: tight enough that a
// careless dependency fails the build, loose enough that ordinary work does
// not. Raise one deliberately, in review, never to make a red build go green.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';
import { join, relative, sep } from 'node:path';

const NEXT = '.next';
const KB = 1024;

// Default budget per route, and the few that are allowed more.
const DEFAULT_BUDGET = 215 * KB;
const BUDGETS = {};

// Strings that exist only in map code: the first in MapLibre's own bundle (a
// class name it gives its canvas), the second in our engine. If any page loads
// a chunk holding either up front, a static import of maplibre-gl, pmtiles or
// @protomaps/basemaps has escaped src/components/map/map-engine.ts. Both are
// needed: importing even one function from maplibre-gl drags in the library
// without our engine.
const MAP_MARKERS = ['maplibregl-canvas', 'basemaps-assets'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function readManifest(file) {
  const context = {};
  runInNewContext(readFileSync(file, 'utf8'), context, { timeout: 1000 });
  const manifest = Object.values(context.__RSC_MANIFEST ?? {})[0];
  if (!manifest) throw new Error(`Invalid client reference manifest: ${file}`);
  return manifest;
}

// "(public)/(search)" is "/", "(app)/bookings/[id]" is "/bookings/[id]".
function routeName(file) {
  const dir = relative(join(NEXT, 'server', 'app'), file).split(sep).slice(0, -1);
  const shown = dir.filter((part) => !(part.startsWith('(') && part.endsWith(')')));
  return '/' + shown.join('/');
}

const gzipped = new Map();
function size(file) {
  if (!gzipped.has(file)) {
    const path = join(NEXT, file);
    gzipped.set(file, existsSync(path) ? gzipSync(readFileSync(path)).length : 0);
  }
  return gzipped.get(file);
}

const build = JSON.parse(readFileSync(join(NEXT, 'build-manifest.json'), 'utf8'));
const framework = [...build.rootMainFiles, ...build.polyfillFiles];

const manifests = walk(join(NEXT, 'server', 'app')).filter((f) => f.endsWith('page_client-reference-manifest.js'));
if (manifests.length === 0) {
  console.error('No route manifests found. Run `next build` first.');
  process.exit(1);
}

let failed = false;
const rows = [];

for (const file of manifests) {
  const route = routeName(file);
  const manifest = readManifest(file);
  const files = new Set(framework);
  for (const chunks of Object.values(manifest.entryJSFiles ?? Object.fromEntries(Object.entries(manifest.clientModules ?? {}).map(([name, entry]) => [name, entry.chunks.filter((chunk) => chunk.endsWith('.js'))])))) {
    for (const chunk of chunks) files.add(chunk);
  }

  const total = [...files].reduce((sum, f) => sum + size(f), 0);
  const budget = BUDGETS[route] ?? DEFAULT_BUDGET;
  const leaked = [...files].filter((f) => existsSync(join(NEXT, f)) && MAP_MARKERS.some((m) => readFileSync(join(NEXT, f), 'utf8').includes(m)));

  const over = total > budget;
  if (over || leaked.length) failed = true;
  rows.push({ route, total, budget, over, leaked });
}

rows.sort((a, b) => a.route.localeCompare(b.route));
for (const r of rows) {
  const status = r.leaked.length ? 'MAP LEAK' : r.over ? 'OVER' : 'ok';
  console.log(`${status.padEnd(9)} ${r.route.padEnd(28)} ${String(Math.round(r.total / KB)).padStart(4)} KB of ${Math.round(r.budget / KB)} KB`);
}

for (const r of rows.filter((x) => x.leaked.length)) {
  console.error(
    `\n${r.route} loads the map engine up front (${r.leaked.join(', ')}).\n` +
      'Something imports maplibre-gl, pmtiles or @protomaps/basemaps statically outside\n' +
      'src/components/map/map-engine.ts. Only that module may import them; the page\n' +
      'loads it with import() when a map is actually shown.',
  );
}
for (const r of rows.filter((x) => x.over && !x.leaked.length)) {
  console.error(`\n${r.route} ships ${Math.round(r.total / KB)} KB up front, over its ${Math.round(r.budget / KB)} KB budget.`);
}

process.exit(failed ? 1 : 0);
