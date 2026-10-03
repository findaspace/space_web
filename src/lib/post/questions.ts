import type { components } from '@/lib/api/schema';

type Field = components['schemas']['FieldSchema'];

// quickQuestions picks what to ask while photos process: the highest-weighted
// fields the host has not answered, limited to ones answerable with a tap.
//
// The weights are the same ones that drive completeness scoring, so these are
// the answers that lift the listing most. Water and power come first for most
// residential types, which is also what anyone renting in Ghana asks first.
// Free-text and numeric fields are left for later: a quick question should
// take one tap, not a keyboard.
export function quickQuestions(fields: Field[] | undefined, answered: Record<string, unknown>, max = 3): Field[] {
  if (!fields) return [];
  return fields
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => (f.kind === 'enum' || f.kind === 'bool') && answered[f.key] === undefined)
    .sort((a, b) => (b.f.weight ?? 0) - (a.f.weight ?? 0) || a.i - b.i)
    .slice(0, max)
    .map(({ f }) => f);
}
