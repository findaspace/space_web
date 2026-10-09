import Image from 'next/image';
import Link from 'next/link';

import { Icon } from '@/components/ui/icon';

const stories = [
  { title: 'A place to live.', detail: 'Rooms, apartments & homes', group: 'homes', image: 'homes', number: '01' },
  { title: 'Room to create.', detail: 'Shops, offices & workspaces', group: 'workspaces', image: 'work', number: '02' },
  { title: 'Bring everyone.', detail: 'Event spaces & studios', group: 'events', image: 'gather', number: '03' },
];

export function SpaceStories() {
  return <section className="space-stories page-shell" aria-labelledby="stories-title">
    <div className="editorial-heading"><div><p className="eyebrow">Different spaces. Your possibilities.</p><h2 id="stories-title">What’s your next move?</h2></div><p>A new address. A fresh idea. A reason to get together.<br />Start with the space.</p></div>
    <div className="stories-grid">{stories.map((story) => <Link key={story.group} prefetch={false} href={`/?group=${story.group}`} className="story-card"><Image src={`/editorial/${story.image}.jpg`} alt="" fill sizes="(min-width: 768px) 33vw, 90vw" /><div className="story-shade" /><span className="story-number">{story.number}</span><div className="story-copy"><p>{story.detail}</p><h3>{story.title}</h3></div><span className="story-arrow"><Icon name="arrow" /></span></Link>)}</div>
    <p className="editorial-disclaimer">Images show possibilities. Browse listings for available spaces and their actual photos.</p>
  </section>;
}

export function OwnerInvitation() {
  return <section className="owner-invitation page-shell" aria-labelledby="owner-title"><div className="owner-panel"><div className="owner-image"><Image src="/editorial/outside.jpg" alt="An airy interior opening onto green plants; illustrative photography" fill sizes="(min-width: 768px) 50vw, 90vw" /></div><div className="owner-copy"><p className="eyebrow">For owners & authorised managers</p><h2 id="owner-title">Someone’s looking<br />for a space like yours.</h2><p>Show them around. Add your photos, location and rental terms. We review your listing before it goes live.</p><Link href="/post" prefetch={false} className="owner-button">List your space<Icon name="arrow" /></Link><span className="owner-note">You handle viewings and agree the rental directly.</span></div></div></section>;
}
