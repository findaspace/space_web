import type { SVGProps } from 'react';

const paths = {
  search: 'M21 21l-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
  home: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10M9 21v-8h6v8',
  bed: 'M3 18v3M21 18v3M3 11v7h18v-7M5 11V5h14v6M8 8h3M14 8h3',
  work: 'M3 8h18v13H3V8M8 8V4h8v4M3 13h18M10 13v3h4v-3',
  event: 'M4 5h16v16H4V5M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2',
  grid: 'M3 3h7v7H3V3M14 3h7v7h-7V3M3 14h7v7H3v-7M14 14h7v7h-7v-7',
  arrow: 'M4 12h16M14 6l6 6-6 6',
  chevron: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M6 18L18 6',
  filter: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  message: 'M4 4h16v13H9l-5 4V4M8 9h8M8 13h5',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  plus: 'M12 4v16M4 12h16',
  menu: 'M4 6h16M4 12h16M4 18h16',
  check: 'M4 12l5 5L20 6',
  shield: 'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4M8 12l3 3 5-6',
  phone: 'M5 3h4l2 5-3 2c2 4 3 5 6 6l2-3 5 2v4c0 2-3 3-6 2C7 18 3 12 3 6c0-2 1-3 2-3',
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, className = 'size-5', ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
