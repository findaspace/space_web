'use client';

import { ResultsMap } from './results-map';

// Module-level, so the map sees the same function on every render and does not
// rebuild its marker each time.
const aroundHere = () => 'Around here';

// The map on a listing: the one grid square the API snapped it to, the honest
// answer to "where is it?" before the owner shares the address.
export function ListingMap({
  slug,
  title,
  latitude,
  longitude,
  tilesUrl,
}: {
  slug: string;
  title: string;
  latitude: number;
  longitude: number;
  tilesUrl?: string;
}) {
  return (
    <div className="h-72 overflow-hidden rounded-lg border border-line md:h-96">
      <ResultsMap
        tilesUrl={tilesUrl}
        cooperative
        showCards={false}
        results={[
          {
            slug, title, latitude, longitude,
            space_type: 'room', rental_mode: 'term', price_minor: 0, currency: 'GHS',
            price_period: 'month', locality: '', photo_count: 0, review_count: 0,
          },
        ]}
        label={aroundHere}
      />
    </div>
  );
}
