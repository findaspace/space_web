'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Icon } from './ui/icon';

export function AccountMenu({ signedIn }: { signedIn: boolean }) {
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const location = `${pathname}?${search}`;
  const open = openedAt === location;

  useEffect(() => {
    if (!open) return;
    function outside(event: Event) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpenedAt(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenedAt(null);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  // Mount a fresh menu on navigation, including filter-only URL changes.
  return <Menu key={`${pathname}?${search}`} signedIn={signedIn} open={open} close={() => setOpenedAt(null)} toggle={() => setOpenedAt(open ? null : location)} container={container} trigger={trigger} />;
}

function Menu({ signedIn, open, close, toggle, container, trigger }: {
  signedIn: boolean; open: boolean; close: () => void; toggle: () => void;
  container: React.RefObject<HTMLDivElement | null>; trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const links = [
    { href: signedIn ? '/account' : '/login', label: signedIn ? 'My profile' : 'Sign in or create account' },
    { href: '/saved', label: 'Saved spaces' },
    { href: '/inbox', label: 'Messages' },
    ...(signedIn ? [{ href: '/notifications', label: 'Notifications' }] : []),
    { href: '/hosting', label: 'Manage my listings' },
    { href: '/post', label: 'List your space' },
    { href: '/safety', label: 'Renting safely' },
  ];
  return <div ref={container} className="relative">
    <button ref={trigger} type="button" aria-label="Open account menu" aria-expanded={open} aria-controls="account-menu" onClick={toggle} className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-3">
      <Icon name="menu" className="size-4" /><span className="hidden size-7 items-center justify-center rounded-full bg-sunk sm:flex"><Icon name="user" className="size-4" /></span>
    </button>
    {open && <nav id="account-menu" aria-label="Account menu" className="absolute top-full right-0 mt-3 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-line bg-surface p-2 shadow-lift">
      {links.map((link, i) => <Link key={link.href} prefetch={false} href={link.href} onClick={close} className={`flex min-h-12 items-center rounded-md px-3 text-subheadline hover:bg-sunk ${i === 0 ? 'font-semibold' : ''} ${link.href === '/safety' ? 'border-t border-line' : ''}`}>{link.label}</Link>)}
    </nav>}
  </div>;
}
