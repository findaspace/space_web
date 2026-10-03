'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon, type IconName } from './ui/icon';

const TOP_LEVEL = ['/', '/saved', '/inbox', '/account', '/hosting', '/notifications', '/bookings', '/safety'];
export function TabBar({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  if (!TOP_LEVEL.includes(path)) return null;
  const items: { href: string; label: string; icon: IconName; on: boolean }[] = [
    { href: '/', label: 'Explore', icon: 'search', on: path === '/' },
    { href: '/saved', label: 'Saved', icon: 'heart', on: path === '/saved' },
    { href: signedIn ? '/inbox' : '/login?next=/inbox', label: 'Inbox', icon: 'message', on: path.startsWith('/inbox') },
    { href: signedIn ? '/account' : '/login', label: signedIn ? 'Profile' : 'Sign in', icon: 'user', on: path === '/account' || path.startsWith('/hosting') },
  ];
  return <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
    <ul className="flex h-[68px] items-stretch">{items.map((item) => <li key={item.label} className="flex-1">
      <Link href={item.href} aria-current={item.on ? 'page' : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] ${item.on ? 'font-semibold text-ink' : 'text-ink-subtle'}`}>
        <Icon name={item.icon} className="size-[23px]" strokeWidth={item.on ? 2 : 1.6} />{item.label}
      </Link>
    </li>)}</ul>
  </nav>;
}
