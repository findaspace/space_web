import Link from 'next/link';

import { GROUPS, groupOf } from '@/lib/search/groups';
import { hrefFor, type SearchState } from '@/lib/search/params';

import { Icon } from '../ui/icon';

export function CategoryRow({ state }: { state: SearchState }) {
  const active = state.group ?? (state.type ? groupOf(state.type) : undefined);
  const items = [{ value: undefined, label: 'All spaces', icon: 'grid' as const }, ...GROUPS];
  return <nav aria-label="Kind of space" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
    <ul className="flex w-max gap-1 md:gap-3">{items.map((g) => <li key={g.label}>
      <Link href={hrefFor(state, { group: g.value, type: undefined })} scroll={false} aria-current={active === g.value ? 'page' : undefined}
        className={`flex min-h-[54px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors md:px-5 md:text-subheadline ${active === g.value ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-sunk hover:text-ink'}`}>
        <Icon name={g.icon} className="size-[18px]" />{g.label}
      </Link>
    </li>)}</ul>
  </nav>;
}
