import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { site } from '@/lib/site';

import { Icon } from './ui/icon';
import { AccountMenu } from './account-menu';
import { UnreadLinks } from './unread-links';

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return <Image src={`/brand/logo-${inverse ? 'light' : 'dark'}.webp`} alt={site.name} width={230} height={54} priority className="h-6 w-auto sm:h-[30px] md:h-[34px]" />;
}

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return <header className="site-header sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
    <div className="page-shell flex h-[72px] items-center justify-between gap-2 sm:gap-4 md:h-[84px]">
      <Link prefetch={false} href="/" aria-label={`${site.name}, home`} className="shrink-0 rounded-sm"><Wordmark /></Link>
      <nav aria-label="Explore" className="hidden items-center gap-7 text-subheadline font-semibold lg:flex">
        <Link prefetch={false} href="/" className="py-4">Explore spaces</Link>
        <Link prefetch={false} href="/saved" className="flex items-center gap-2 py-4"><Icon name="heart" className="size-4" />Saved</Link>
      </nav>
      <nav aria-label="Account" className="flex items-center gap-2 md:gap-3">
        <Link prefetch={false} href="/post" className="hidden min-h-11 items-center gap-2 rounded-full px-4 text-subheadline font-semibold hover:bg-sunk md:flex"><Icon name="plus" className="size-4" />List your space</Link>
        {signedIn ? <UnreadLinks /> : null}
        <Suspense fallback={<span aria-hidden="true" className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-3"><Icon name="menu" className="size-4" /><span className="hidden size-7 items-center justify-center rounded-full bg-sunk sm:flex"><Icon name="user" className="size-4" /></span></span>}><AccountMenu signedIn={signedIn} /></Suspense>
      </nav>
    </div>
  </header>;
}
