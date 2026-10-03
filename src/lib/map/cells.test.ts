import { describe, expect, it } from 'vitest';

import { APPROX_GRID, boundsOf, cellRing, groupByCell } from './cells';

const r = (slug: string, latitude: number, longitude: number) =>
  ({ slug, latitude, longitude }) as Parameters<typeof groupByCell>[0][number];

describe('groupByCell', () => {
  // Listings in one square arrive at exactly the same point. Separate markers
  // would stack, and only the top one could be tapped.
  it('puts listings that share a square behind one marker', () => {
    const cells = groupByCell([r('a', 5.6825, -0.1675), r('b', 5.6825, -0.1675), r('c', 5.6875, -0.1675)]);
    expect(cells).toHaveLength(2);
    expect(cells.find((c) => c.latitude === 5.6825)?.results.map((x) => x.slug)).toEqual(['a', 'b']);
  });

  it('is empty for no results', () => {
    expect(groupByCell([])).toEqual([]);
  });
});

describe('cellRing', () => {
  it('is a closed square exactly one grid cell across', () => {
    const ring = cellRing(5.6825, -0.1675);
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    const width = ring[1]![0] - ring[0]![0];
    const height = ring[2]![1] - ring[1]![1];
    expect(width).toBeCloseTo(APPROX_GRID, 10);
    expect(height).toBeCloseTo(APPROX_GRID, 10);
  });

  it('is in longitude, latitude order, as GeoJSON requires', () => {
    const [lng, lat] = cellRing(5.6825, -0.1675)[0]!;
    expect(lng).toBeLessThan(0);
    expect(lat).toBeGreaterThan(5);
  });
});

describe('boundsOf', () => {
  it('frames whole squares, not just their centres', () => {
    const b = boundsOf(groupByCell([r('a', 5.6825, -0.1675)]))!;
    expect(b[0][0]).toBeCloseTo(-0.17, 10);
    expect(b[1][1]).toBeCloseTo(5.685, 10);
  });

  it('has nothing to frame for no results', () => {
    expect(boundsOf([])).toBeNull();
  });
});

// The grid is defined twice, here and in the Go API. If they ever differ the
// squares drawn would not be the squares the listings were snapped to.
describe('grid', () => {
  it('matches the API', () => {
    expect(APPROX_GRID).toBe(0.005);
  });
});
