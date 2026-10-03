import Image from 'next/image';
import Link from 'next/link';

import { site } from '@/lib/site';

import { Icon } from './ui/icon';
import { UnreadLinks } from './unread-links';

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return <Image src={`/brand/logo-${inverse ? 'light' : 'dark'}.webp`} alt={site.name} width={230} height={54} priority className="h-6 w-auto sm:h-[30px] md:h-[34px]" />;
}

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
    <div className="page-shell flex h-[72px] items-center justify-between gap-2 sm:gap-4 md:h-[84px]">
      <Link href="/" aria-label={`${site.name}, home`} className="shrink-0 rounded-sm"><Wordmark /></Link>
      <nav aria-label="Explore" className="hidden items-center gap-7 text-subheadline font-semibold lg:flex">
        <Link href="/" className="py-4">Explore spaces</Link>
        <Link href="/saved" className="flex items-center gap-2 py-4"><Icon name="heart" className="size-4" />Saved</Link>
      </nav>
      <nav aria-label="Account" className="flex items-center gap-2 md:gap-3">
        <Link href="/post" className="hidden min-h-11 items-center gap-2 rounded-full px-4 text-subheadline font-semibold hover:bg-sunk md:flex"><Icon name="plus" className="size-4" />List your space</Link>
        {signedIn ? <UnreadLinks /> : null}
        <details className="relative">
          <summary aria-label="Open account menu" className="flex min-h-11 list-none items-center gap-2 rounded-full border border-line-strong px-3 [&::-webkit-details-marker]:hidden">
            <Icon name="menu" className="size-4" /><span className="hidden size-7 items-center justify-center rounded-full bg-sunk sm:flex"><Icon name="user" className="size-4" /></span>
          </summary>
          <nav aria-label="Account menu" className="absolute top-full right-0 mt-3 w-60 overflow-hidden rounded-lg border border-line bg-surface p-2 shadow-lift">
            <Link href={signedIn ? '/account' : '/login'} className="flex min-h-12 items-center rounded-md px-3 text-subheadline font-semibold hover:bg-sunk">{signedIn ? 'My profile' : 'Sign in or create account'}</Link>
            <Link href="/saved" className="flex min-h-12 items-center rounded-md px-3 text-subheadline hover:bg-sunk">Saved spaces</Link>
            <Link href="/inbox" className="flex min-h-12 items-center rounded-md px-3 text-subheadline hover:bg-sunk">Messages</Link>
            {signedIn ? <Link href="/notifications" className="flex min-h-12 items-center rounded-md px-3 text-subheadline hover:bg-sunk">Notifications</Link> : null}
            <Link href="/hosting" className="flex min-h-12 items-center rounded-md px-3 text-subheadline hover:bg-sunk">Manage my listings</Link>
            <Link href="/post" className="flex min-h-12 items-center rounded-md px-3 text-subheadline hover:bg-sunk">List your space</Link>
            <Link href="/safety" className="flex min-h-12 items-center rounded-md border-t border-line px-3 text-subheadline hover:bg-sunk">Renting safely</Link>
          </nav>
        </details>
      </nav>
    </div>
  </header>;
}
