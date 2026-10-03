import { describe, expect, it } from 'vitest';

import { looksLikeContact, mergeMessages, notificationHref, preview } from './messages';

const m = (id: string, body = id) => ({ id, sender_id: 'u', body, redacted: false, created_at: '2026-09-26T10:00:00Z' });

describe('mergeMessages', () => {
  it('orders oldest first, as a conversation reads', () => {
    expect(mergeMessages([m('0199b')], [m('0199a'), m('0199c')]).map((x) => x.id)).toEqual(['0199a', '0199b', '0199c']);
  });

  // The message just sent comes back again on the next poll; it must appear once.
  it('never shows a message twice', () => {
    expect(mergeMessages([m('0199a'), m('0199b')], [m('0199b'), m('0199c')])).toHaveLength(3);
  });

  it('prefers the newer copy of a message', () => {
    const merged = mergeMessages([m('0199a', 'old')], [m('0199a', 'new')]);
    expect(merged[0]?.body).toBe('new');
  });
});

describe('looksLikeContact', () => {
  it.each(['call me 0244123456', 'my number is 024 412 3456', 'ama@gmail.com', 'wa.me/233244', 'see https://x.gh', 'WhatsApp me'])(
    'warns for %j',
    (text) => {
      expect(looksLikeContact(text)).toBe(true);
    },
  );

  it.each(['Is the water steady?', 'Can I view it on Saturday at 10?', 'Two rooms, 12 months'])('stays quiet for %j', (text) => {
    expect(looksLikeContact(text)).toBe(false);
  });
});

describe('preview', () => {
  it('collapses whitespace and cuts on a word', () => {
    const out = preview(`Hello\n\nthere ${'word '.repeat(40)}`, 40);
    expect(out.startsWith('Hello there')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(40);
  });
});

describe('notificationHref', () => {
  it('opens the booking a notification is about', () => {
    expect(notificationHref('booking.confirmed', { booking_id: '01a0db89-740d-7c46-b3eb-883371a10d6e' })).toBe(
      '/bookings/01a0db89-740d-7c46-b3eb-883371a10d6e',
    );
  });

  it('sends payout news to payouts', () => {
    expect(notificationHref('payout.paid', {})).toBe('/hosting/payouts');
  });

  // Data comes from the API, but a link is still built from it; anything that
  // is not a plain id is ignored rather than put in a URL.
  it('ignores a booking id that is not an id', () => {
    expect(notificationHref('booking.confirmed', { booking_id: '../../admin' })).toBe('/notifications');
  });
});
