// Copies MapLibre's Web Worker, and the shared module it imports, from the
// installed package into public/maplibre/, where the map engine points
// setWorkerUrl. Run on every install and build (see package.json), so the
// copies always match the installed MapLibre. A worker from one version with
// a main bundle from another fails with errors that look unrelated.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'maplibre-gl', 'dist');
const to = join(root, 'public', 'maplibre');

mkdirSync(to, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(from, file), join(to, file));
}
console.log('copied the MapLibre worker into public/maplibre');
