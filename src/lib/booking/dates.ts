// Calendar dates for bookings. Ghana keeps GMT all year, so UTC dates are Ghana
// dates, and a check-in is a date, never an instant.

const DAY = 86_400_000;

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || toISODate(d) !== s ? null : d;
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  return d ? toISODate(new Date(d.getTime() + days * DAY)) : iso;
}

export function today(now: Date = new Date()): string {
  return toISODate(now);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseISODate(checkIn);
  const b = parseISODate(checkOut);
  return a && b ? Math.round((b.getTime() - a.getTime()) / DAY) : 0;
}

// firstTakenNight answers "can I stay these nights?" before any request is
// sent. The nights of a stay are check-in up to, not including, check-out: a
// guest leaving on the 4th does not need the night of the 4th.
export function firstTakenNight(checkIn: string, checkOut: string, taken: ReadonlySet<string>): string | null {
  const n = nightsBetween(checkIn, checkOut);
  for (let i = 0; i < n; i++) {
    const night = addDays(checkIn, i);
    if (taken.has(night)) return night;
  }
  return null;
}

const long = new Intl.DateTimeFormat('en-GH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const short = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const clock = new Intl.DateTimeFormat('en-GH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Accra' });
const dayAndClock = new Intl.DateTimeFormat('en-GH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Accra' });

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return d ? long.format(d) : iso;
}

export function formatShort(iso: string): string {
  const d = parseISODate(iso);
  return d ? short.format(d) : iso;
}

// formatDeadline says when something runs out, in Ghana time. Within the day,
// the time alone reads naturally; beyond it, the day matters too.
export function formatDeadline(instant: string, now: Date = new Date()): string {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return instant;
  return d.getTime() - now.getTime() < 20 * 3_600_000 ? clock.format(d) : dayAndClock.format(d);
}
