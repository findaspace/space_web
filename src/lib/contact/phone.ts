// Ghanaian numbers as people write them, and the links that dial or open
// WhatsApp. The API stores E.164 (+233244123456); people read 024 412 3456.

const GH = /^\+233(\d{9})$/;

export function formatGhanaPhone(e164: string): string {
  const m = GH.exec(e164);
  if (!m) return e164; // a foreign number is shown exactly as stored
  const n = m[1]!;
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

export function telHref(e164: string): string {
  return `tel:${e164.replace(/[^\d+]/g, '')}`;
}

// The message is written for the renter, and names the listing: an owner with
// several places needs to know which one the call is about, and a report of a
// scam is easier to trace when the first message says where it started.
export function whatsappHref(e164: string, listingTitle: string, ownerName?: string): string {
  const digits = e164.replace(/\D/g, '');
  const hello = ownerName ? `Hello ${ownerName.split(' ')[0]}` : 'Hello';
  const text = `${hello}, I saw your listing "${listingTitle}" on Findaspace. Is it still available?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
