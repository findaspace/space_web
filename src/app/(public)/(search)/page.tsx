import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ListingCard } from '@/components/listing/listing-card';
import { RowScroller } from '@/components/listing/row-scroller';
import { ResultsMap } from '@/components/map/results-map';
import { CategoryRow } from '@/components/search/category-row';
import { LoadMore } from '@/components/search/load-more';
import { ModeSwitch } from '@/components/search/mode-switch';
import { SearchPill } from '@/components/search/search-pill';
import { Icon } from '@/components/ui/icon';
import { unwrap } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';
import { env } from '@/lib/env';
import { GROUPS, groupFor } from '@/lib/search/groups';
import { CATEGORIES, SORTS, hasFilters, MODES, hrefFor, parseSearch, toApiQuery, type SearchState } from '@/lib/search/params';
import { site } from '@/lib/site';

type Result = components['schemas']['SearchResult'];
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PLURAL: Record<string, string> = { room: 'Rooms', self_contained: 'Self-contained spaces', chamber_and_hall: 'Chamber and hall', apartment: 'Apartments', house: 'Houses', hostel_bed: 'Hostel beds', shop: 'Shops', office: 'Offices', warehouse: 'Warehouses', event_space: 'Event spaces', land: 'Land', parking: 'Parking', boys_quarters: 'Boys’ quarters',football_pitch:'Football pitches',sports_court:'Sports courts',sports_facility:'Sports facilities',studio:'Studios' };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseSearch(await searchParams);
  const kind = state.type ? PLURAL[state.type] : groupFor(state.group)?.label ?? 'Spaces';
  return { title: hasFilters(state) ? `${kind}${state.q ? ` in ${state.q}` : ' in Ghana'}` : { absolute: `${site.name} · Space for the way you live` }, description: site.description, robots: state.cursor ? { index: false, follow: true } : undefined };
}

export default async function Home({ searchParams }: Props) {
  const state = parseSearch(await searchParams);
  const searching = hasFilters(state) || Boolean(state.cursor);
  const client = await serverApi();
  const page = await unwrap(client.GET('/v1/search', { params: { query: searching ? toApiQuery(state) : { sort: 'newest', limit: 50 } } }));
  return <main id="main-content">
    {!searching ? <Hero results={page.results} /> : null}
    <section className={`page-shell ${searching ? 'pt-6 md:pt-8' : 'pt-1 md:pt-0'}`} aria-label="Search spaces">
      <SearchPill key={hrefFor(state)} state={state} large={!searching} />
      <div className="mt-6 border-b border-line pb-5 md:mt-7"><CategoryRow state={state} /></div>
    </section>
    <div className="page-shell">{searching ? <Results state={state} page={page} /> : <Discover results={page.results} />}</div>
  </main>;
}

function Hero({ results }: { results: Result[] }) {
  const photos = results.filter((r) => r.cover_url).slice(0, 3);
  return <section className="page-shell grid items-center gap-8 pt-8 pb-7 md:pt-12 md:pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
    <div className="max-w-xl">
      <p className="eyebrow flex items-center gap-2 text-ink-muted"><span className="h-px w-6 bg-ink" />Find your place in Ghana</p>
      <h1 className="mt-4 text-[39px] leading-[1.08] font-semibold tracking-[-0.055em] sm:text-[52px] lg:text-[64px]">Space for the<br />way you live.</h1>
      <p className="mt-4 max-w-md text-[15px] leading-6 text-ink-muted md:mt-5 md:text-[17px] md:leading-7">A room near campus. A home of your own. A place for your next big idea. Find it here, and talk directly to the people behind it.</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium md:mt-7"><span className="flex items-center gap-1.5"><Icon name="check" className="size-4" />Free to browse</span><span className="flex items-center gap-1.5"><Icon name="message" className="size-4" />Direct conversations</span></div>
    </div>
    {photos.length > 0 ? <div className="relative hidden h-[330px] grid-cols-[1.2fr_1fr] grid-rows-2 gap-3 lg:grid">
      {photos.map((r, i) => <Link key={r.slug} href={`/s/${r.slug}`} className={`relative overflow-hidden rounded-[22px] bg-sunk ${i === 0 ? 'row-span-2' : ''} ${photos.length === 1 ? 'col-span-2' : ''}`}>
        <Image src={r.cover_url!} alt={r.title} fill priority sizes={i === 0 ? '360px' : '260px'} className="object-cover transition-transform duration-500 hover:scale-105" />
        <span className="absolute right-3 bottom-3 left-3 rounded-lg bg-surface/95 p-3"><span className="block text-[11px] text-ink-muted">{CATEGORIES.find((c) => c.value === r.space_type)?.label}</span><span className="mt-0.5 block truncate text-[13px] font-semibold">{r.locality}<Icon name="arrow" className="float-right size-4" /></span></span>
      </Link>)}
    </div> : <div className="hidden h-[290px] items-center justify-center rounded-[24px] bg-sunk lg:flex"><Image src="/brand/symbol-dark.webp" width={110} height={130} alt="" /></div>}
  </section>;
}

function Discover({ results }: { results: Result[] }) {
  if (!results.length) return <div className="mx-auto max-w-md py-20 text-center"><Icon name="home" className="mx-auto size-10" /><h2 className="mt-5 text-title-2">Be the first to open a door.</h2><p className="mt-3 text-body text-ink-muted">Have a room, a home or a space to rent? Your first listing could help someone find their place.</p><Link href="/post" className="primary-button mt-6">List your space</Link></div>;
  const homes = results.filter((r) => r.rental_mode === 'term' && (groupFor('homes')!.types as readonly string[]).includes(r.space_type));
  const short = results.filter((r) => r.rental_mode === 'nightly');
  const work = results.filter((r) => (groupFor('workspaces')!.types as readonly string[]).includes(r.space_type));
  const hostels = results.filter((r) => r.space_type === 'hostel_bed');
  const events = results.filter((r) => r.space_type === 'event_space' || r.space_type==='studio');
 const sports=results.filter((r)=>(groupFor('sports')!.types as readonly string[]).includes(r.space_type));
  return <div className="space-y-10 pt-8 md:space-y-12 md:pt-10">
    <Row title="Fresh spaces. New possibilities." subtitle="The latest places to join Findaspace." href="/?sort=newest" results={results.slice(0, 8)} priority />
    <section aria-labelledby="browse-purpose"><div className="mb-5 flex items-end justify-between"><div><p className="eyebrow text-ink-subtle">Make room for what matters</p><h2 id="browse-purpose" className="section-title mt-2">What are you looking for?</h2></div></div><ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{GROUPS.map((g) => <li key={g.value}><Link href={`/?group=${g.value}`} className="group flex h-full min-h-36 flex-col rounded-[18px] border border-line bg-sunk/50 p-5 transition-colors hover:border-ink hover:bg-surface"><Icon name={g.icon} className="mb-5 size-7" /><h3 className="text-subheadline font-semibold">{g.label}</h3><p className="mt-1 text-[12px] leading-5 text-ink-muted">{g.description}</p><Icon name="arrow" className="mt-4 size-4 transition-transform group-hover:translate-x-1" /></Link></li>)}</ul></section>
    {homes.length > 0 && <Row title="Somewhere to call home." subtitle="Rooms, apartments and homes for a longer stay." href="/?group=homes&mode=monthly" results={homes.slice(0, 8)} />}
    {hostels.length > 0 && <Row title="A little closer to campus." subtitle="Find your next hostel space." href="/?group=hostels" results={hostels.slice(0, 8)} />}
    {short.length > 0 && <Row title="Stay a little. Feel at home." subtitle="Spaces available by the night." href="/?mode=nightly" results={short.slice(0, 8)} />}
    {sports.length>0&&<Row title="Find your next game." subtitle="Football pitches, courts and spaces to play." href="/?group=sports" results={sports.slice(0,8)}/>}
    {work.length > 0 && <Row title="Your ideas need room." subtitle="Shops, offices and spaces to build something." href="/?group=workspaces" results={work.slice(0, 8)} />}
    {events.length > 0 && <Row title="Bring your people together." subtitle="Find a setting for your next gathering." href="/?group=events" results={events.slice(0, 8)} />}
    <HowItWorks />
    <section className="flex flex-col justify-between gap-6 rounded-[24px] bg-ink p-7 text-paper md:flex-row md:items-center md:p-10"><div><p className="eyebrow text-paper/70">For owners & authorised managers</p><h2 className="section-title mt-3">Your space could be someone’s next chapter.</h2><p className="mt-3 max-w-lg text-subheadline leading-6 text-paper/75">Add your photos and details. We review your listing before it goes live. You handle the conversations and rental arrangements.</p></div><Link href="/post" className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-paper px-6 text-subheadline font-semibold text-ink">List your space<Icon name="arrow" /></Link></section>
  </div>;
}
function Row({ title, subtitle, href, results, priority = false }: { title: string; subtitle: string; href: string; results: Result[]; priority?: boolean }) {
  return <section aria-label={title}><div className="mb-5 pr-24"><Link href={href} className="inline-flex items-center gap-3"><h2 className="section-title">{title}</h2><Icon name="chevron" className="size-4" /></Link><p className="mt-2 text-footnote text-ink-muted">{subtitle}</p></div><RowScroller label={title}>{results.map((r, i) => <li key={r.slug} className="snap-start"><ListingCard result={r} priority={priority && i < 2} /></li>)}</RowScroller></section>;
}
function HowItWorks() {
  const steps = [{ title: 'Find a space you love', body: 'Explore photos, locations and rental terms. Save your favourites as you go.', icon: 'search' as const }, { title: 'Talk to the person behind it', body: 'Sign in with your phone to message, call or contact them on WhatsApp.', icon: 'message' as const }, { title: 'See it. Then decide.', body: 'Arrange a viewing, check the details and agree the rental directly.', icon: 'home' as const }];
  return <section aria-labelledby="how-title" className="border-y border-line py-9 md:py-11"><p className="eyebrow text-ink-subtle">From searching to settling in</p><h2 id="how-title" className="section-title mt-2">A simpler way to find your space.</h2><ol className="mt-7 grid gap-7 md:grid-cols-3 md:gap-10">{steps.map((s, i) => <li key={s.title}><div className="mb-4 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-sunk"><Icon name={s.icon} /></span><span className="eyebrow text-ink-subtle">0{i + 1}</span></div><h3 className="text-headline">{s.title}</h3><p className="mt-2 max-w-sm text-subheadline leading-6 text-ink-muted">{s.body}</p></li>)}</ol><Link href="/safety" className="mt-6 inline-flex min-h-11 items-center gap-2 text-footnote font-semibold underline underline-offset-4"><Icon name="shield" className="size-4" />Read our guide to renting safely</Link></section>;
}
function Results({ state, page }: { state: SearchState; page: components['schemas']['SearchPage'] }) {
  const baseHref = hrefFor(state, { cursor: undefined });
  const query = baseHref === '/' ? '' : baseHref.slice(2);
  const kind = state.type ? PLURAL[state.type] : groupFor(state.group)?.label ?? 'Spaces';
  const mapAvailable = Boolean(env.SPACE_MAP_TILES_URL);
  return <div className="py-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow text-ink-subtle">Find your next space</p><h1 className="section-title mt-2">{kind}{state.q ? ` in ${state.q}` : ' in Ghana'}</h1><p className="mt-2 text-footnote text-ink-muted">{page.results.length}{page.next_cursor ? '+' : ''} {page.results.length === 1 ? 'space' : 'spaces'}{state.mode ? ` · ${MODES.find((m)=>m.value===state.mode)?.label} rates` : ' · Check each listing’s price period'}</p></div><div className="flex flex-wrap items-center gap-3"><ModeSwitch state={state} /><SortLinks state={state} /></div></div>
    {page.results.length === 0 ? <div className="mx-auto max-w-sm py-20 text-center"><Icon name="search" className="mx-auto size-10" /><h2 className="mt-5 text-title-2">A little more room to search?</h2><p className="mt-3 text-body text-ink-muted">No spaces match these filters yet. Try a nearby area or adjust your budget.</p><Link href="/" className="secondary-button mt-6">Clear filters</Link><Link href="/post" className="mt-4 block text-subheadline underline">Have a space here? List it.</Link></div> : <div className={`mt-7 ${state.view === 'map' && mapAvailable ? 'lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8' : ''}`}>
      <ul className={`grid gap-x-6 gap-y-9 sm:grid-cols-2 ${state.view === 'map' && mapAvailable ? 'hidden lg:grid' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>{page.results.map((r, i) => <li key={r.slug}><ListingCard result={r} priority={i < 2} /></li>)}{page.next_cursor && <LoadMore key={query} query={query} cursor={page.next_cursor} baseHref={baseHref} />}</ul>
      {state.view === 'map' && mapAvailable && <div className="sticky top-28 h-[65dvh] min-h-96 overflow-hidden rounded-[20px] border border-line"><ResultsMap results={page.results} tilesUrl={env.SPACE_MAP_TILES_URL} cooperative={false} /></div>}
    </div>}
    {mapAvailable && page.results.length > 0 && <Link href={hrefFor(state, { view: state.view === 'map' ? undefined : 'map' })} scroll={false} className="fixed bottom-24 left-1/2 z-20 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-subheadline font-semibold text-paper shadow-lift md:bottom-7"><Icon name={state.view === 'map' ? 'grid' : 'pin'} className="size-4" />{state.view === 'map' ? 'Show list' : 'Show map'}</Link>}
  </div>;
}
function SortLinks({ state }: { state: SearchState }) {
  return <nav aria-label="Sort" className="hidden gap-1 sm:flex">{SORTS.map((s) => <Link key={s.value} href={hrefFor(state, { sort: s.value })} scroll={false} aria-current={state.sort === s.value ? 'page' : undefined} className={`flex min-h-11 items-center rounded-full border px-3 text-footnote ${state.sort === s.value ? 'border-ink font-semibold' : 'border-line text-ink-muted'}`}>{s.label}</Link>)}</nav>;
}
