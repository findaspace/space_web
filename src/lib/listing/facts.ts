import type { components } from '@/lib/api/schema';

type Field = components['schemas']['FieldSchema'];

export type Fact = { key: string; label: string; value: string };

// humanize turns an API value into words: "semi_furnished" becomes
// "Semi furnished". The API sends option values, not labels, so this is the
// one place they are made readable.
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : spaced;
}

const UNITS: Record<string, string> = { m2: 'm²', acres: 'acres', m: 'm' };

function display(field: Field | undefined, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  if (typeof raw === 'number') {
    const unit = field?.unit ? ` ${UNITS[field.unit] ?? field.unit}` : '';
    return `${raw.toLocaleString('en-GH')}${unit}`;
  }
  if (typeof raw === 'string') return humanize(raw);
  return null;
}

// facts lists a listing's attributes the way the API's schema describes them:
// its labels, its units, and its order.
//
// Ordered by the schema's weight, highest first, which is the same weight that
// drives completeness scoring. Water and power carry the most weight because
// they are the first things anyone renting in Ghana asks, so they come first
// here too.
//
// When the schema could not be loaded, the attributes are still shown with
// readable keys rather than hidden. A label that is slightly off beats a
// listing that looks empty.
export function facts(attributes: Record<string, unknown>, fields?: Field[]): Fact[] {
  if (!fields?.length) {
    return Object.entries(attributes)
      .map(([key, raw]) => ({ key, label: humanize(key), value: display(undefined, raw) }))
      .filter((f): f is Fact => f.value !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return [...fields]
    .map((field, index) => ({ field, index }))
    .sort((a, b) => (b.field.weight ?? 0) - (a.field.weight ?? 0) || a.index - b.index)
    .map(({ field }) => ({ key: field.key, label: field.label, value: display(field, attributes[field.key]) }))
    .filter((f): f is Fact => f.value !== null);
}
