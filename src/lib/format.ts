import type { components } from '@/lib/api/schema';

type Result = components['schemas']['SearchResult'];
type Period = Result['price_period'];

// Short enough to sit beside a price on a narrow phone without wrapping.
const PER: Record<Period, string> = {
  night: '/night',
  week: '/wk',
  month: '/mo',
  year: '/yr',
 hour:'/hr', day:'/day', semester:'/semester', academic_year:'/academic year',
};

export function perLabel(period: Period): string {
  return PER[period];
}

// whereLabel prefers a routed walking time, because "6 min walk to Madina
// Market" tells someone in Accra far more than a neighbourhood name. When a
// listing has not been routed yet it falls back to the locality alone rather
// than inventing a distance.
export function whereLabel(r: Pick<Result, 'locality' | 'landmark_name' | 'walk_minutes'>): string {
  if (r.landmark_name && r.walk_minutes) {
    return `${r.walk_minutes} min walk to ${r.landmark_name}`;
  }
  return r.locality;
}
