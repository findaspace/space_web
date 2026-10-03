import type { components } from '@/lib/api/schema';

export type SavedSpace = components['schemas']['SearchResult'];
export const SAVED_KEY = 'findaspace:saved:v1';
const changed = 'findaspace:saved-changed';
const MAX_SAVED = 100;

// Local snapshots contain public listing information only, never contact or session data.
export function decodeSaved(raw: string | null): SavedSpace[] {
  try {
    const data: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data.filter((r): r is SavedSpace => {
      if (!r || typeof r !== 'object' || typeof r.slug !== 'string' || !/^[a-z0-9-]{1,160}$/.test(r.slug) || seen.has(r.slug)) return false;
      if (typeof r.title !== 'string' || typeof r.locality !== 'string' || typeof r.space_type !== 'string' || !['nightly', 'term'].includes(r.rental_mode)) return false;
      if (!Number.isSafeInteger(r.price_minor) || r.price_minor <= 0 || !['night', 'week', 'month', 'year','hour','day','semester','academic_year'].includes(r.price_period)) return false;
      if (r.currency !== 'GHS' || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return false;
      if (r.cover_url && (typeof r.cover_url !== 'string' || !/^https?:\/\//.test(r.cover_url))) return false;
      seen.add(r.slug);
      return true;
    }).slice(0, MAX_SAVED);
  } catch { return []; }
}

export function savedSnapshot(): string {
  try { return localStorage.getItem(SAVED_KEY) ?? '[]'; } catch { return '[]'; }
}
export function subscribeSaved(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === SAVED_KEY || event.key === null) callback(); };
  window.addEventListener('storage', storage);
  window.addEventListener(changed, callback);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(changed, callback); };
}
export function toggleSaved(space: SavedSpace): { ok: boolean; saved: boolean } {
  const items = decodeSaved(savedSnapshot());
  const exists = items.some((r) => r.slug === space.slug);
  if (!exists && items.length >= MAX_SAVED) return { ok: false, saved: false };
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(exists ? items.filter((r) => r.slug !== space.slug) : [space, ...items]));
    window.dispatchEvent(new Event(changed));
    return { ok: true, saved: !exists };
  } catch { return { ok: false, saved: exists }; }
}
