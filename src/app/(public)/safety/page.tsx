import type { Metadata } from 'next';
import Link from 'next/link';

import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Renting safely in Ghana',
  description: 'How renting goes wrong in Ghana, how to avoid it, and what the law says about advance rent.',
};

// Everything here is either practical advice or the law as it stands, with
// the source named. The Rent Control Department began enforcing the six-month
// advance limit on 1 April 2026, so it is stated as current, not aspirational.
const SECTIONS = [
  {
    title: 'See it before you pay',
    points: [
      'Visit the space in person, at a time you choose, before any money changes hands.',
      'Never pay to “hold” or “reserve” a place you have not seen, however good the photos look.',
      'Be wary of an owner who is suddenly abroad, in a hurry, or only reachable by message.',
    ],
  },
  {
    title: 'Make sure they can rent it to you',
    points: [
      'Ask to see proof they own the place or are allowed to let it: a title document, a lease, or a letter from the owner.',
      'Talk to a neighbour or the caretaker. They usually know who the landlord is.',
      'If an agent is involved, meet them at the property and agree their fee before the viewing.',
    ],
  },
  {
    title: 'Know the law on advance rent',
    points: [
      'The Rent Act, 1963 (Act 220) limits advance rent to six months for tenancies longer than six months, and one month for monthly or shorter tenancies.',
      'Advance-rent demands should follow the applicable tenancy rules. Check the current requirements with the Rent Control Department.',
      'Ask for a rent card and a written tenancy agreement, and a receipt for every payment.',
      'Complaints go to your nearest Rent Control office, or online at rentcontrol.mwh.gov.gh.',
    ],
  },
  {
    title: `Keep contact on ${site.name} until you have met`,
    points: [
      'Chatting here keeps a record tied to phone-verified accounts, which helps if something goes wrong.',
      'If a conversation feels suspicious, stop and keep a copy of the listing and messages. Seek advice from the relevant authorities before paying.',
    ],
  },
];

export default function SafetyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 pt-8 pb-16 md:pt-14">
      <p className="text-subheadline font-semibold text-state-ink">Safety</p>
      <h1 className="mt-1 text-large-title">Renting safely in Ghana</h1>
      <p className="mt-3 text-body text-ink-muted">
        Most people you meet here are honest. These are the habits that protect you from the few who are not.
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-10">
          <h2 className="text-title-3">{s.title}</h2>
          <ul className="mt-3 space-y-3">
            {s.points.map((p) => (
              <li key={p} className="flex gap-3 text-body">
                <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-state" />
                <span className="text-ink-muted">{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-8 text-footnote text-ink-muted">Source: <a href="https://ir.parliament.gh/bitstream/handle/123456789/2063/RENT%20ACT%2C%201963%20%28ACT%20220%29.pdf" target="_blank" rel="noopener noreferrer" className="underline">Rent Act, 1963 (Act 220), section 25(5)</a>. Confirm how the rules apply to your tenancy with Rent Control.</p>
      <Link href="/" className="mt-12 inline-flex h-12 items-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed">
        Find a space
      </Link>
    </main>
  );
}
