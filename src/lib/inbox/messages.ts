import type { components } from '@/lib/api/schema';

type Message = components['schemas']['Message'];

// mergeMessages combines what is on screen with what just arrived: a newer
// page from polling, an older page from scrolling back, or the message the
// user just sent. Keyed by id, so a message seen twice (sent, then returned
// by the next poll) appears once. Ordered oldest first, as a conversation
// reads. The ids are time-ordered UUIDv7, so sorting by id is sorting by time.
export function mergeMessages(current: readonly Message[], incoming: readonly Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of current) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// looksLikeContact warns the sender before sending that part of a message
// will be hidden, instead of letting them discover it afterwards. It is a
// courtesy, not the control: space_api does the redacting, and a pattern this
// misses is still caught there.
export function looksLikeContact(text: string): boolean {
  const digits = (text.match(/\d/g) ?? []).length;
  return digits >= 7 || /@|wa\.me|whatsapp|https?:\/\/|www\./i.test(text);
}

// preview shortens a message for the inbox list, on a word boundary.
export function preview(text: string | undefined, max = 90): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}

// notificationHref decides where tapping a notification goes, from the data
// the API attached to it. Unknown events fall back to the list rather than a
// guessed page.
export function notificationHref(event: string, data: Record<string, unknown> | undefined): string {
  const bookingId = typeof data?.booking_id === 'string' ? data.booking_id : undefined;
  if (bookingId && /^[0-9a-f-]{36}$/.test(bookingId)) return `/bookings/${bookingId}`;
  if (event.startsWith('payout.')) return '/hosting/payouts';
  if (event.startsWith('media.')) return '/hosting';
  return '/notifications';
}
