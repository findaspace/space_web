import Link from 'next/link';

import { InstallApp } from './install-app';
import { Icon } from './ui/icon';
import { site } from '@/lib/site';
import { Wordmark } from './site-header';

const columns = [
  { title: 'Find your space', links: [['Homes & rooms', '/?group=homes'], ['Hostels', '/?group=hostels'], ['Workspaces', '/?group=workspaces'], ['Events & studios', '/?group=events'], ['Sports', '/?group=sports']] },
  { title: 'Make it yours', links: [['Saved spaces', '/saved'], ['Messages', '/inbox'], ['Your account', '/account'], ['Renting safely', '/safety'], ['Help and safety', '/support'], ['Privacy', '/privacy']] },
  { title: 'Open your doors', links: [['List a space', '/post'], ['Manage listings', '/hosting']] },
] as const;

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="page-shell"><div className="footer-statement"><p>Every next chapter<br />starts somewhere.</p><Link href="/?sort=newest" prefetch={false} aria-label="Explore the newest spaces"><Icon name="arrow" className="size-7" /></Link></div>
      <div className="footer-columns"><div><Wordmark inverse /><p className="footer-description">Find a space for the way you live.<br />Homes, work and gatherings in Ghana.</p><InstallApp /></div>{columns.map((column) => <nav key={column.title} aria-label={column.title}><h2>{column.title}</h2><ul>{column.links.map(([label, href]) => <li key={href}><Link href={href} prefetch={false}>{label}</Link></li>)}</ul></nav>)}</div>
      <div className="footer-base"><p>© {new Date().getFullYear()} {site.name}</p><p>Ghana · English · GH₵ GHS</p></div>
    </div>
  </footer>;
}
