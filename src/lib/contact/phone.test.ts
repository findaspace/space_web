import { describe, expect, it } from 'vitest';

import { formatGhanaPhone, telHref, whatsappHref } from './phone';

describe('formatGhanaPhone', () => {
  it('writes a Ghanaian number the way people read it', () => {
    expect(formatGhanaPhone('+233244123456')).toBe('024 412 3456');
    expect(formatGhanaPhone('+233501234567')).toBe('050 123 4567');
  });

  it('leaves anything else exactly as stored', () => {
    expect(formatGhanaPhone('+393513833633')).toBe('+393513833633');
  });
});

describe('links', () => {
  it('dials the full international number', () => {
    expect(telHref('+233244123456')).toBe('tel:+233244123456');
  });

  it('opens WhatsApp with a message naming the listing and the owner', () => {
    const href = whatsappHref('+233244123456', 'Chamber and hall in Madina', 'Kofi Mensah');
    expect(href.startsWith('https://wa.me/233244123456?text=')).toBe(true);
    const text = decodeURIComponent(href.split('text=')[1]!);
    expect(text).toBe('Hello Kofi, I saw your listing "Chamber and hall in Madina" on Findaspace. Is it still available?');
  });

  it('greets without a name when the owner has none', () => {
    expect(decodeURIComponent(whatsappHref('+233244123456', 'Shop in Osu').split('text=')[1]!)).toMatch(/^Hello, I saw/);
  });
});
