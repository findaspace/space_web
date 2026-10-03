'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

import type { components } from '@/lib/api/schema';

import { Icon } from '../ui/icon';

type Media = components['schemas']['Media'];
export function Gallery({ media, title }: { media: Media[]; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);
  function open(index: number) { setActive(index); dialog.current?.showModal(); }
  function move(direction: number) { setActive((i) => (i + direction + media.length) % media.length); }
  if (media.length === 0) return <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-[20px] bg-sunk text-ink-subtle lg:aspect-[21/9]"><Icon name="home" className="size-10" /><p className="text-subheadline">Photos aren’t available for this space yet.</p></div>;
  const photo = media[active]!;
  return <>
    <div className="relative -mx-5 md:mx-0 lg:hidden">
      <ul className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:rounded-[22px]" onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {media.map((m, i) => <li key={m.id} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-sunk"><button type="button" onClick={() => open(i)} className="relative block size-full" aria-label={`Open photo ${i + 1} of ${media.length}`}><Image src={m.url} alt={`${title} · photo ${i + 1}`} fill priority={i === 0} loading={i === 0 ? undefined : 'lazy'} sizes="100vw" className="object-cover" /></button></li>)}
      </ul>
      <button type="button" onClick={() => open(slide)} className="absolute right-4 bottom-4 flex min-h-11 items-center gap-2 rounded-full bg-ink/80 px-4 text-footnote font-semibold text-paper" aria-label="Show all photos"><Icon name="grid" className="size-4" /><span className="tabular">{slide + 1} / {media.length}</span></button>
    </div>
    <div className={`relative hidden h-[460px] gap-2 overflow-hidden rounded-[24px] lg:grid ${media.length === 1 ? 'grid-cols-1' : media.length < 5 ? 'grid-cols-2' : 'grid-cols-4 grid-rows-2'}`}>
      {media.slice(0, 5).map((m, i) => <button key={m.id} type="button" onClick={() => open(i)} aria-label={`Open photo ${i + 1} of ${media.length}`} className={`relative bg-sunk ${i === 0 && media.length >= 5 ? 'col-span-2 row-span-2' : ''}`}><Image src={i === 0 ? m.url : m.card_url ?? m.url} alt={`${title} · photo ${i + 1}`} fill priority={i === 0} loading={i === 0 ? undefined : 'lazy'} sizes={i === 0 ? '640px' : '320px'} className="object-cover transition-opacity hover:opacity-90" /></button>)}
      <button type="button" onClick={() => open(0)} className="absolute right-5 bottom-5 flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-footnote font-semibold"><Icon name="grid" className="size-4" />Show all {media.length} photos</button>
    </div>
    <dialog ref={dialog} aria-labelledby="gallery-title" onKeyDown={(e) => { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-ink p-4 text-paper md:p-8">
      <div className="flex items-center justify-between gap-4"><h2 id="gallery-title" className="truncate text-subheadline">{title}</h2><button type="button" onClick={() => dialog.current?.close()} className="flex min-h-11 items-center gap-2 rounded-full border border-paper/30 px-4 text-subheadline" aria-label="Close photo gallery"><Icon name="close" />Close</button></div>
      <div className="relative mx-auto mt-5 h-[calc(100dvh-200px)] max-w-5xl"><Image src={photo.url} alt={`${title} · photo ${active + 1}`} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain" />{media.length > 1 && <><button type="button" aria-label="Previous photo" onClick={() => move(-1)} className="absolute top-1/2 left-0 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink"><Icon name="chevron" className="size-5 rotate-180" /></button><button type="button" aria-label="Next photo" onClick={() => move(1)} className="absolute top-1/2 right-0 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink"><Icon name="chevron" /></button></>}</div>
      <p className="tabular mt-3 text-center text-subheadline" aria-live="polite">{active + 1} of {media.length}</p>
      <div className="mt-3 flex justify-center gap-2 overflow-x-auto">{media.map((m, i) => <button type="button" key={m.id} aria-label={`View photo ${i + 1}`} aria-pressed={active === i} onClick={() => setActive(i)} className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-sm ${active === i ? 'ring-2 ring-paper ring-offset-2 ring-offset-ink' : 'opacity-60'}`}><Image src={m.card_url ?? m.url} alt="" fill sizes="64px" className="object-cover" /></button>)}</div>
    </dialog>
  </>;
}
