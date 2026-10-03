import type { components } from '@/lib/api/schema';

type Result = components['schemas']['SearchResult'];

// Must equal ApproxGrid in space_api's internal/geo/approx.go. The API snaps
// every public coordinate to the centre of a square this many degrees across,
// about 550 metres, so the map draws that square: it is the honest answer to
// "where is it?" before a booking.
export const APPROX_GRID = 0.005;

export type Cell = {
  key: string;
  latitude: number;
  longitude: number;
  results: Result[];
};

// groupByCell collects listings that share a grid square. Because the API
// snaps them to the square's centre, they share exactly the same point, and
// separate markers would sit on top of one another with all but one
// impossible to tap. One marker per square instead, listing everything in it.
export function groupByCell(results: readonly Result[]): Cell[] {
  const cells = new Map<string, Cell>();
  for (const r of results) {
    const key = `${r.latitude.toFixed(6)},${r.longitude.toFixed(6)}`;
    const cell = cells.get(key);
    if (cell) {
      cell.results.push(r);
    } else {
      cells.set(key, { key, latitude: r.latitude, longitude: r.longitude, results: [r] });
    }
  }
  return [...cells.values()];
}

// cellRing is the square around a cell's centre, as a closed GeoJSON ring
// in longitude, latitude order.
export function cellRing(latitude: number, longitude: number): [number, number][] {
  const h = APPROX_GRID / 2;
  return [
    [longitude - h, latitude - h],
    [longitude + h, latitude - h],
    [longitude + h, latitude + h],
    [longitude - h, latitude + h],
    [longitude - h, latitude - h],
  ];
}

export type Bounds = [[number, number], [number, number]];

// boundsOf frames every cell, including the whole of each square rather than
// only its centre, so no square is cut off at the edge of the map.
export function boundsOf(cells: readonly Cell[]): Bounds | null {
  if (cells.length === 0) return null;
  const h = APPROX_GRID / 2;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const c of cells) {
    minLng = Math.min(minLng, c.longitude - h);
    maxLng = Math.max(maxLng, c.longitude + h);
    minLat = Math.min(minLat, c.latitude - h);
    maxLat = Math.max(maxLat, c.latitude + h);
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

// Accra's centre, for a map with nothing to show.
export const DEFAULT_CENTER: [number, number] = [-0.187, 5.6037];
