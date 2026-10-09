import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { CinematicHero } from '@/components/cinematic-hero';
import { OwnerInvitation, SpaceStories } from '@/components/space-stories';

import { SearchRetry } from '@/components/search/search-retry';
import { ListingCardSkeleton } from '@/components/listing/listing-card';
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
import { groupFor } from '@/lib/search/groups';
import { SORTS, hasFilters, MODES, hrefFor, parseSearch, toApiQuery, type SearchState } from '@/lib/search/params';
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
  return <main id="main-content" className={searching ? 'search-page' : 'discovery-page'}>
    {!searching ? <Hero state={state} /> : <section className="page-shell search-toolbar" aria-label="Search spaces"><SearchPill key={hrefFor(state)} state={state} /></section>}
    <section className="page-shell category-strip" aria-label="Space categories"><CategoryRow state={state} /></section>
    {!searching && <SpaceStories />}
    <div className="page-shell"><Suspense key={hrefFor(state)} fallback={<SearchLoading />}><Inventory state={state} searching={searching} /></Suspense></div>
    {!searching && <><HowItWorks /><OwnerInvitation /></>}
  </main>;
}

async function Inventory({ state, searching }: { state: SearchState; searching: boolean }) {
  let page: components['schemas']['SearchPage'];
  try {
    const client = await serverApi();
    page = await unwrap(client.GET('/v1/search', { params: { query: searching ? toApiQuery(state) : { sort: 'newest', limit: 32 } } }));
  } catch {
    return <section className="search-unavailable" aria-labelledby="search-unavailable-title"><Icon name="search" className="size-8" /><h2 id="search-unavailable-title" className="section-title">Spaces are taking a little longer to load.</h2><p>Your search is still here. Try again in a moment.</p><SearchRetry /></section>;
  }
  return searching ? <Results state={state} page={page} /> : <Discover results={page.results} />;
}
function SearchLoading() {
  return <section className="py-9" aria-label="Loading spaces" aria-busy="true"><p role="status" className="mb-5 text-subheadline text-ink-muted">Finding spaces…</p><div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}</div></section>;
}
function Hero({ state }: { state: SearchState }) {
  return <section className="cinematic-hero" aria-labelledby="hero-title">
    <CinematicHero />
    <div className="hero-content page-shell"><p className="hero-eyebrow">Findaspace / Ghana</p><h1 id="hero-title">Life happens<br />in a space.<span>Find yours.</span></h1><p className="hero-description">Somewhere to live, work, or bring people together.<br className="hidden sm:block" /> Find your next space in Ghana.</p><a href="#start-search" className="hero-explore">Make your next move<Icon name="arrow" className="size-5" /></a></div>
    <div id="start-search" className="hero-search page-shell"><div className="hero-search-label"><span>Where do you want to be?</span><Link href="/safety" prefetch={false}><Icon name="shield" className="size-4" />View before you pay</Link></div><SearchPill state={state} large /></div>
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
    <Row title="Recently listed" subtitle="The latest places to join Findaspace." href="/?sort=newest" results={results.slice(0, 8)} priority />

    {homes.length > 0 && <Row title="Homes and rooms" subtitle="Rooms, apartments and homes for a longer stay." href="/?group=homes&mode=monthly" results={homes.slice(0, 8)} />}
    {hostels.length > 0 && <Row title="Hostel spaces" subtitle="Find your next hostel space." href="/?group=hostels" results={hostels.slice(0, 8)} />}
    {short.length > 0 && <Row title="Short stays" subtitle="Spaces available by the night." href="/?mode=nightly" results={short.slice(0, 8)} />}
    {sports.length>0&&<Row title="Sports spaces" subtitle="Football pitches, courts and spaces to play." href="/?group=sports" results={sports.slice(0,8)}/>}
    {work.length > 0 && <Row title="Shops and workspaces" subtitle="Shops, offices and spaces to build something." href="/?group=workspaces" results={work.slice(0, 8)} />}
    {events.length > 0 && <Row title="Event spaces and studios" subtitle="Find a setting for your next gathering." href="/?group=events" results={events.slice(0, 8)} />}

  </div>;
}
function Row({ title, subtitle, href, results, priority = false }: { title: string; subtitle: string; href: string; results: Result[]; priority?: boolean }) {
  return <section aria-label={title}><div className="inventory-heading mb-5 pr-24"><Link href={href} className="inline-flex items-center gap-3"><h2 className="section-title">{title}</h2><Icon name="chevron" className="size-4" /></Link><p className="mt-2 text-footnote text-ink-muted">{subtitle}</p></div><RowScroller label={title}>{results.map((r, i) => <li key={r.slug} className="snap-start"><ListingCard result={r} priority={priority && i < 2} /></li>)}</RowScroller></section>;
}
function HowItWorks() {
  const steps = [{ title: 'Find a space you love', body: 'Explore photos, locations and rental terms. Save your favourites as you go.', icon: 'search' as const }, { title: 'Talk to the person behind it', body: 'Sign in to message the owner, call or contact them on WhatsApp.', icon: 'message' as const }, { title: 'See it. Then decide.', body: 'Arrange a viewing, check the details and agree the rental directly.', icon: 'home' as const }];
  return <section aria-labelledby="how-title" className="how-section page-shell"><p className="eyebrow text-ink-subtle">From searching to settling in</p><h2 id="how-title" className="section-title mt-2">Find it. See it. Make your move.</h2><ol className="mt-7 grid gap-7 md:grid-cols-3 md:gap-10">{steps.map((s, i) => <li key={s.title}><div className="mb-4 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-sunk"><Icon name={s.icon} /></span><span className="eyebrow text-ink-subtle">0{i + 1}</span></div><h3 className="text-headline">{s.title}</h3><p className="mt-2 max-w-sm text-subheadline leading-6 text-ink-muted">{s.body}</p></li>)}</ol><Link href="/safety" className="mt-6 inline-flex min-h-11 items-center gap-2 text-footnote font-semibold underline underline-offset-4"><Icon name="shield" className="size-4" />Read our guide to renting safely</Link></section>;
}
function Results({ state, page }: { state: SearchState; page: components['schemas']['SearchPage'] }) {
  const baseHref = hrefFor(state, { cursor: undefined });
  const query = baseHref === '/' ? '' : baseHref.slice(2);
  const kind = state.type ? PLURAL[state.type] : groupFor(state.group)?.label ?? 'Spaces';
  const mapAvailable = Boolean(env.SPACE_MAP_TILES_URL);
  return <div className="py-7">
    <div className="grid min-w-0 gap-5" data-testid="results-heading"><div><p className="eyebrow text-ink-subtle">Find your next space</p><h1 className="section-title mt-2">{kind}{state.q ? ` in ${state.q}` : ' in Ghana'}</h1><p className="mt-2 text-footnote text-ink-muted">{page.results.length}{page.next_cursor ? '+' : ''} {page.results.length === 1 ? 'space' : 'spaces'}{state.mode ? ` · ${MODES.find((m)=>m.value===state.mode)?.label} rates` : ' · Check each listing’s price period'}</p></div><div className="grid min-w-0 gap-3" data-testid="results-controls"><ModeSwitch state={state} /><SortLinks state={state} /></div></div>
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
