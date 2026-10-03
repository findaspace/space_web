// Ghana keeps GMT all year, with no daylight saving, so UTC dates are Ghana
// dates. That is what makes plain UTC arithmetic correct here; the same code
// would be subtly wrong for a market with a summer time change.

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// nextMonthStart is the default move-in date for a quote: the first of next
// month, which is when most leases in Ghana begin. December rolls over into
// January of the next year.
export function nextMonthStart(now: Date = new Date()): string {
  return iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
}

// excerpt shortens a description for a search result or a link preview, on a
// word boundary so it never ends mid-word.
export function excerpt(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}…`;
}
