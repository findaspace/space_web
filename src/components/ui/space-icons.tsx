// One line icon per kind of space, drawn to the same 24px grid and stroke so
// the category row reads as a set. Inline, so the row costs no requests and
// takes its colour from the text around it.

type Props = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const PATHS: Record<string, string> = {
  all: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  room: 'M3 19v-7.5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5V19M3 15h18M6 10V7a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 7v3M9 10V8.5h6V10',
  self_contained: 'M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M3.5 21h17M14.5 12v1.5',
  chamber_and_hall: 'M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 12.5a1.5 1.5 0 0 1 3 0V15h12v-2.5a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 18v2M18 18v2',
  apartment: 'M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M7.5 7h1.5M10.5 7H12M7.5 11h1.5M10.5 11H12M7.5 15h1.5M10.5 15H12',
  house: 'M3 11.5 12 4l9 7.5M5 10v10h14V10M10 20v-5.5h4V20',
  hostel_bed: 'M5 3v18M19 3v18M5 10h14M5 17h14M8 8h5M8 15h5',
  shop: 'M4 10.5V20h16v-9.5M3 4.5h18l-1.2 4a2.4 2.4 0 0 1-4.6 0 2.4 2.4 0 0 1-4.6 0 2.4 2.4 0 0 1-4.6 0zM10 20v-5h4v5',
  office: 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18M11 13v2h2v-2',
  warehouse: 'M3 9.5 12 4l9 5.5V20H3zM7 20v-7h10v7M7 16.5h10',
  event_space: 'M3 20 12 5l9 15zM12 5v15M8.5 20l3.5-6 3.5 6',
  land: 'M3 20h18M5.5 20l2-6h9l2 6M12 14V5.5l5 2-5 2',
  parking: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM10 16.5v-9h3.2a2.8 2.8 0 0 1 0 5.6H10',
  boys_quarters: 'M3 20h18M5 20v-6.5l5-4 5 4V20M9 20v-3.5h2V20M18.5 20v-5M18.5 12.5a2 2 0 1 0 0-.01',
};

export function SpaceIcon({ kind, className = 'size-6' }: Props & { kind: string }) {
  return (
    <svg {...base} className={className}>
      <path d={PATHS[kind] ?? PATHS.all} />
    </svg>
  );
}
