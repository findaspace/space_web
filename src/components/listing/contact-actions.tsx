'use client';

import Link from 'next/link';
import { useState } from 'react';

import { revealContact, type Contact } from '@/lib/contact/actions';
import { formatGhanaPhone, telHref, whatsappHref } from '@/lib/contact/phone';

type Props = {
  spaceId: string;
  slug: string;
  title: string;
  signedIn: boolean;
};

const primary =
  'flex h-12 items-center justify-center gap-2 rounded-md bg-action px-5 text-headline text-on-action active:bg-action-pressed disabled:opacity-60';
const secondary =
  'flex h-12 items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-5 text-headline active:bg-sunk';

function useReveal(spaceId: string) {
  const [contact, setContact] = useState<Contact>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function reveal() {
    setBusy(true);
    setError(undefined);
    const res = await revealContact(spaceId);
    setBusy(false);
    if (res.ok) setContact(res.data);
    else setError(res.error);
  }
  return { contact, busy, error, reveal };
}

// The card beside the details on a desktop.
export function ContactCard({ spaceId, slug, title, signedIn }: Props) {
  const { contact, busy, error, reveal } = useReveal(spaceId);

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-3">
        <Link href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`} className={primary}>
          Contact owner or manager
        </Link>
        <Link href={`/login?next=${encodeURIComponent(`/message/${slug}`)}`} className={secondary}>
          Send a message
        </Link>
        <p className="text-footnote text-ink-subtle">
          Free to contact. Sign in with your phone to reveal their number or start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {contact ? (
        <>
          <div className="rounded-md bg-sunk px-4 py-3">
            <p className="text-footnote text-ink-muted">{contact.name || 'Listing contact'}</p>
            <a href={telHref(contact.phone)} className="tabular text-title-2 underline-offset-4 hover:underline">
              {formatGhanaPhone(contact.phone)}
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href={telHref(contact.phone)} className={secondary}>
              Call
            </a>
            <a href={whatsappHref(contact.phone, title, contact.name)} target="_blank" rel="noopener noreferrer" className={secondary}>
              WhatsApp
            </a>
          </div>
        </>
      ) : (
        <button type="button" onClick={reveal} disabled={busy} className={primary}>
          {busy ? 'Getting the number' : 'Show phone number'}
        </button>
      )}
      <Link href={`/message/${slug}`} className={secondary}>
        Message on Findaspace
      </Link>
      {error ? <p role="alert" className="text-footnote text-danger">{error}</p> : null}
    </div>
  );
}

// The bar pinned to the bottom of a phone screen: the price, and one button
// that becomes Call and WhatsApp once the number is shown.
export function ContactBar({ spaceId, slug, title, signedIn, price }: Props & { price: React.ReactNode }) {
  const { contact, busy, error, reveal } = useReveal(spaceId);

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift lg:hidden">
      {error ? <p role="alert" className="mb-2 text-footnote text-danger">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{price}</div>
        {!signedIn ? (
          <Link href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`} className={`${primary} shrink-0`}>
            Contact owner
          </Link>
        ) : contact ? (
          <div className="flex shrink-0 gap-2">
            <a href={telHref(contact.phone)} className={secondary} aria-label={`Call ${formatGhanaPhone(contact.phone)}`}>
              Call
            </a>
            <a href={whatsappHref(contact.phone, title, contact.name)} target="_blank" rel="noopener noreferrer" className={primary}>
              WhatsApp
            </a>
          </div>
        ) : (
          <button type="button" onClick={reveal} disabled={busy} className={`${primary} shrink-0`}>
            {busy ? 'Getting it' : 'Show number'}
          </button>
        )}
      </div>
    </div>
  );
}
