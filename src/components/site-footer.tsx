import Link from 'next/link';

import { site } from '@/lib/site';

import { Wordmark } from './site-header';

export function SiteFooter() {
  return <footer className="mt-14 border-t border-line bg-sunk/60 pb-24 md:pb-8">
    <div className="page-shell grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div><Wordmark /><p className="mt-4 max-w-xs text-subheadline leading-6 text-ink-muted">Space for the way you live.<br />Find it in Ghana. Make it yours.</p></div>
      <div><h2 className="text-subheadline font-semibold">Find a space</h2><ul className="mt-3 space-y-1 text-footnote text-ink-muted"><li><Link href="/?group=homes" className="inline-flex min-h-9 items-center hover:underline">Homes & rooms</Link></li><li><Link href="/?group=hostels" className="inline-flex min-h-9 items-center hover:underline">Hostels</Link></li><li><Link href="/?group=workspaces" className="inline-flex min-h-9 items-center hover:underline">Workspaces</Link></li><li><Link href="/?group=events" className="inline-flex min-h-9 items-center hover:underline">Event spaces</Link></li></ul></div>
      <div><h2 className="text-subheadline font-semibold">Your Findaspace</h2><ul className="mt-3 space-y-1 text-footnote text-ink-muted"><li><Link href="/saved" className="inline-flex min-h-9 items-center hover:underline">Saved spaces</Link></li><li><Link href="/inbox" className="inline-flex min-h-9 items-center hover:underline">Messages</Link></li><li><Link href="/safety" className="inline-flex min-h-9 items-center hover:underline">Renting safely</Link></li></ul></div>
      <div><h2 className="text-subheadline font-semibold">Share your space</h2><ul className="mt-3 space-y-1 text-footnote text-ink-muted"><li><Link href="/post" className="inline-flex min-h-9 items-center hover:underline">List a space</Link></li><li><Link href="/hosting" className="inline-flex min-h-9 items-center hover:underline">Manage listings</Link></li><li><Link href="/account" className="inline-flex min-h-9 items-center hover:underline">Your account</Link></li></ul></div>
    </div>
    <div className="page-shell"><div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[12px] text-ink-subtle"><p>© {new Date().getFullYear()} {site.name}</p><p>Ghana · English · GH₵ GHS</p></div></div>
  </footer>;
}
