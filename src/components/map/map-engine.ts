// Everything heavy about the map lives in this module, and nothing imports it
// statically: the shell loads it with import() once the map is actually on
// screen. MapLibre alone is about 146 KB compressed, so a phone that never
// opens the map downloads none of this, its stylesheet included.
import 'maplibre-gl/dist/maplibre-gl.css';

import { layers, namedFlavor } from '@protomaps/basemaps';
// MapLibre 6 is ESM with named exports only; there is no default export.
// Its Map is renamed so it cannot shadow JavaScript's Map below.
import {
  addProtocol,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';

import { boundsOf, cellRing, DEFAULT_CENTER, type Cell } from '@/lib/map/cells';

// Official Protomaps assets ship with the app, avoiding a third-party request
// for map fonts/icons. UPSTREAM.json records their source and revision.
const GLYPHS = '/map-assets/fonts/{fontstack}/{range}.pbf';
const SPRITE = '/map-assets/sprites/v4/light';

// OpenStreetMap's licence requires the credit; Protomaps asks for it.
const ATTRIBUTION =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// MapLibre parses tiles in a Web Worker that it finds relative to its own
// module, and the bundler does not ship that file. scripts/copy-map-worker.mjs
// copies the worker, and the shared module it imports, from the installed
// package into public/ on every install and build, so the two can never be
// different versions. Set here, inside the lazily loaded engine: calling it
// from the page's own code would import all of MapLibre up front.
const WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

let registered = false;
const protocol = new Protocol();

// Colours come from the design tokens in globals.css rather than being typed
// again here, so the map cannot drift from the rest of the interface.
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export type Engine = {
  setCells: (cells: Cell[], label: (c: Cell) => string) => void;
  setSelected: (key: string | null) => void;
  destroy: () => void;
};

export function mountMap(options: {
  container: HTMLElement;
  tilesUrl: string;
  // On a desktop page that also scrolls, the map should not steal the scroll
  // wheel; a full-screen phone map should respond to every gesture.
  cooperative: boolean;
  onSelect: (key: string | null) => void;
  onStatus: (status: 'ready' | 'failed') => void;
  resetArchive?: boolean;
}): Engine {
  if (!registered) {
    setWorkerUrl(WORKER_URL);
    // pmtiles reads the one tile file with HTTP range requests, straight from
    // the bucket: no tile server, and no cost per map view.
    addProtocol('pmtiles', protocol.tile);
    registered = true;
  }
  // PMTiles' shared cache retains a rejected header promise after a network
  // failure. Retrying needs a fresh archive reader, not just a new canvas.
  if (options.resetArchive) protocol.add(new PMTiles(options.tilesUrl));

  const state = token('--color-state');
  const map = new MapLibreMap({
    container: options.container,
    center: DEFAULT_CENTER,
    zoom: 11,
    cooperativeGestures: options.cooperative,
    attributionControl: { compact: true },
    style: {
      version: 8,
      glyphs: `${window.location.origin}${GLYPHS}`,
      // MapLibre 6 requires an absolute sprite URL for inline styles.
      sprite: new URL(SPRITE, window.location.origin).href,
      sources: {
        protomaps: { type: 'vector', url: `pmtiles://${options.tilesUrl}`, attribution: ATTRIBUTION },
        cells: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      },
      layers: [
        ...layers('protomaps', namedFlavor('light'), { lang: 'en' }),
        // The approximate area: a pale square, not a pin, because the listing
        // is somewhere inside it and the map should not claim otherwise.
        { id: 'cells-fill', type: 'fill', source: 'cells', paint: { 'fill-color': state, 'fill-opacity': 0.12 } },
        { id: 'cells-line', type: 'line', source: 'cells', paint: { 'line-color': state, 'line-width': 1.5, 'line-opacity': 0.6 } },
      ],
    },
  });
  // A tile, font or style that fails to load is otherwise silent: the map just
  // looks empty. Reported once, so a broken tiles URL shows up in the console.
  let failed = false;
  const loadTimeout = setTimeout(() => { failed = true; options.onStatus('failed'); }, 30_000);
  map.on('error', (event) => {
    console.error('map error', event.error);
    failed = true;
    options.onStatus('failed');
  });
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  map.on('click', (e: MapMouseEvent) => {
    // A tap on the map itself, not on a marker, closes the card.
    if ((e.originalEvent.target as HTMLElement).closest('[data-cell]') === null) options.onSelect(null);
  });

  const markers = new Map<string, { marker: Marker; el: HTMLButtonElement }>();
  let loaded = false;
  let pending: Cell[] | null = null;

  function drawCells(cells: Cell[]) {
    const source = map.getSource<GeoJSONSource>('cells');
    source?.setData({
      type: 'FeatureCollection',
      features: cells.map((c) => ({
        type: 'Feature',
        properties: { key: c.key },
        geometry: { type: 'Polygon', coordinates: [cellRing(c.latitude, c.longitude)] },
      })),
    });
  }

  map.on('load', () => {
    clearTimeout(loadTimeout);
    loaded = true;
    if (pending) drawCells(pending);
    if (!failed) options.onStatus('ready');
  });

  return {
    setCells(cells, label) {
      for (const { marker } of markers.values()) marker.remove();
      markers.clear();

      for (const c of cells) {
        // A real button, so a marker can be reached and pressed without a
        // pointer, and read out by a screen reader.
        const el = document.createElement('button');
        el.type = 'button';
        el.dataset.cell = c.key;
        el.textContent = label(c);
        el.setAttribute('aria-label', `${label(c)}, ${c.results.length === 1 ? c.results[0]!.title : `${c.results.length} places here`}`);
        el.className = 'tabular rounded-full border border-line bg-surface px-2.5 py-1 text-footnote font-semibold text-ink';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onSelect(c.key);
        });
        markers.set(c.key, { el, marker: new Marker({ element: el }).setLngLat([c.longitude, c.latitude]).addTo(map) });
      }

      if (loaded) drawCells(cells);
      else pending = cells;

      const bounds = boundsOf(cells);
      if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
    },

    setSelected(key) {
      for (const [k, { el }] of markers) {
        const on = k === key;
        el.classList.toggle('bg-ink', on);
        el.classList.toggle('text-paper', on);
        el.classList.toggle('bg-surface', !on);
        el.classList.toggle('text-ink', !on);
        el.setAttribute('aria-pressed', String(on));
      }
    },

    destroy() {
      clearTimeout(loadTimeout);
      map.remove();
    },
  };
}
