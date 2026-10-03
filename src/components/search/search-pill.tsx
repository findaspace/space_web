'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { groupFor } from '@/lib/search/groups';
import { CATEGORIES, MODES, type SearchState } from '@/lib/search/params';

import { Icon } from '../ui/icon';

export function SearchPill({ state, large = false }: { state: SearchState; large?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState(state.mode ?? '');
  const types = state.group ? CATEGORIES.filter((c) => (groupFor(state.group)?.types as readonly string[])?.includes(c.value)) : CATEGORIES;
  const filterCount = Number(Boolean(state.type)) + Number(Boolean(state.mode)) + Number(Boolean(state.max));
  const preserved = <>{state.group && <input type="hidden" name="group" value={state.group} />}{state.view && <input type="hidden" name="view" value={state.view} />}</>;
  return <div className={`w-full ${large ? '' : 'max-w-5xl'}`}>
    <div className="flex items-center gap-3 md:hidden">
      <form action="/" method="get" role="search" className="flex h-[58px] min-w-0 flex-1 items-center gap-3 rounded-full border border-line-strong bg-surface px-4 shadow-lift">
        {preserved}
        {state.type && <input type="hidden" name="type" value={state.type} />}
        {state.mode && <input type="hidden" name="mode" value={state.mode} />}
        {state.max && <input type="hidden" name="max" value={state.max} />}
        <button type="submit" aria-label="Search spaces" className="flex size-11 shrink-0 items-center justify-center"><Icon name="search" /></button>
        <label className="min-w-0 flex-1"><span className="sr-only">Area or landmark</span><input type="search" name="q" defaultValue={state.q} placeholder="Area or landmark" maxLength={80} enterKeyHint="search" className="w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-ink-subtle" /></label>
      </form>
      <button type="button" onClick={() => dialog.current?.showModal()} className="relative flex size-[54px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface" aria-label={`Search filters${filterCount ? `, ${filterCount} active` : ''}`}><Icon name="filter" />{filterCount > 0 && <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] text-paper">{filterCount}</span>}</button>
    </div>
    <form action="/" method="get" role="search" className="hidden min-h-[80px] items-center rounded-full border border-line-strong bg-surface pl-3 pr-2 shadow-lift md:flex">
      {preserved}
      <label className="min-w-0 flex-[1.4] px-5"><span className="block text-[12px] font-semibold">Where</span><input type="search" name="q" defaultValue={state.q} placeholder={state.group === 'hostels' ? 'Area or university' : 'Area or landmark'} maxLength={80} className="mt-1 w-full bg-transparent text-subheadline outline-none" /></label>
      <span aria-hidden="true" className="h-9 w-px bg-line" />
      <label className="min-w-0 flex-1 px-5"><span className="block text-[12px] font-semibold">Space type</span><select name="type" defaultValue={state.type ?? ''} className="mt-1 w-full cursor-pointer truncate bg-transparent text-subheadline outline-none"><option value="">Any type</option>{types.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <span aria-hidden="true" className="h-9 w-px bg-line" />
      <label className="min-w-0 flex-1 px-5"><span className="block text-[12px] font-semibold">Rental period</span><select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 w-full cursor-pointer bg-transparent text-subheadline outline-none"><option value="">Any period</option>{MODES.map((m)=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
      <label className="min-w-0 flex-1 border-l border-line px-4"><span className="block text-[12px] font-semibold">Budget</span><input name="max" type="number" inputMode="numeric" min={1} max={10000000} defaultValue={state.max} disabled={!mode} placeholder={mode ? 'Max GH₵' : 'Choose period'} className="mt-1 w-full bg-transparent text-subheadline outline-none disabled:opacity-60" /></label>
      <button type="submit" className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-action-pressed" aria-label="Search spaces"><Icon name="search" className="size-6" /></button>
    </form>
    <dialog ref={dialog} className="sheet-dialog" aria-labelledby="search-dialog-title" onClick={(e) => { if (e.target === e.currentTarget && e.clientY < e.currentTarget.getBoundingClientRect().top) dialog.current?.close(); }}>
      <div className="flex items-center justify-between"><h2 id="search-dialog-title" className="text-title-2">Find your space</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close search filters" className="flex size-11 items-center justify-center rounded-full bg-sunk"><Icon name="close" /></button></div>
      <form action="/" method="get" className="mt-6 space-y-5">
        {preserved}
        <label className="block"><span className="mb-2 block text-subheadline font-semibold">Where?</span><input name="q" type="search" defaultValue={state.q} maxLength={80} placeholder="Area, landmark or university" className="field-input" /></label>
        <label className="block"><span className="mb-2 block text-subheadline font-semibold">What kind of space?</span><select name="type" defaultValue={state.type ?? ''} className="field-input"><option value="">Any type</option>{types.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-subheadline font-semibold">Rental period</span><select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="field-input"><option value="">Any period</option>{MODES.map((m)=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-subheadline font-semibold">Maximum listed price (GH₵)</span><input name="max" type="number" inputMode="numeric" min={1} max={10000000} defaultValue={state.max} disabled={!mode} placeholder={mode ? 'Enter your budget' : 'Choose a rental period first'} className="field-input disabled:opacity-50" /></label>
        <p className="text-footnote leading-5 text-ink-muted">Budget applies to the advertised price. Check each listing’s price period and upfront terms.</p>
        <label className="block"><span className="mb-2 block text-subheadline font-semibold">Sort by</span><select name="sort" defaultValue={state.sort} className="field-input"><option value="relevance">Best match</option><option value="newest">Newest listings</option><option value="price_asc">Lowest price</option></select></label>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-5"><Link href="/" className="min-h-11 py-3 text-subheadline font-semibold underline">Clear all</Link><button type="submit" className="primary-button">Search spaces<Icon name="search" /></button></div>
      </form>
    </dialog>
  </div>;
}
