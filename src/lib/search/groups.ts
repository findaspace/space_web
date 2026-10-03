import type { Category } from './params';

export const GROUPS = [
  { value: 'homes', label: 'Homes', icon: 'home', description: 'A place to call your own', types: ['room', 'self_contained', 'chamber_and_hall', 'apartment', 'house', 'boys_quarters'] },
  { value: 'hostels', label: 'Hostels', icon: 'bed', description: 'Stay close to campus', types: ['hostel_bed'] },
  { value: 'workspaces', label: 'Workspaces', icon: 'work', description: 'Room for your next idea', types: ['office', 'shop', 'warehouse'] },
  { value: 'events', label: 'Events & studios', icon: 'event', description: 'Bring people together', types: ['event_space','studio'] },
  {value:'sports',label:'Sports',icon:'grid',description:'Find your next game',types:['football_pitch','sports_court','sports_facility']},
  { value: 'more', label: 'More spaces', icon: 'grid', description: 'Land, parking and more', types: ['land', 'parking'] },
] as const;

export type Group = typeof GROUPS[number]['value'];
export function groupFor(value?: string) { return GROUPS.find((g) => g.value === value); }
export function groupOf(type: Category): Group { return GROUPS.find((g) => (g.types as readonly string[]).includes(type))?.value ?? 'more'; }
