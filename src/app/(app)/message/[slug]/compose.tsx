'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { looksLikeContact } from '@/lib/inbox/messages';

import { sendToHost } from '../../inbox/actions';

// The questions people ask before anything else, one tap each. A blank box is
// the hardest thing to start writing in; a first line removes that.
const STARTERS = ['Is it still available?', 'Can I come and see it this week?', 'Is the water supply steady?', 'Is there power backup?'];

export function Compose({ spaceId, paymentsEnabled = false }: { spaceId: string; paymentsEnabled?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  async function send() {
    setSending(true);
    setError(undefined);
    const res = await sendToHost(spaceId, text);
    if (!res.ok) {
      setSending(false);
      setError(res.error);
      return;
    }
    router.push(`/inbox/${res.data.threadId}`);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setText((t) => (t ? `${t} ${s}` : s))}
            className="flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-subheadline active:bg-sunk"
          >
            {s}
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="sr-only">Your message</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Ask the host anything about the place"
          className="w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-body"
        />
      </label>
      {paymentsEnabled && looksLikeContact(text) ? (
        <p className="mt-2 text-footnote text-ink-muted">{paymentsEnabled ? 'Phone numbers, emails and links are hidden until a booking is paid.' : 'Contact details may be hidden in messages. Use the listing’s contact options to call or WhatsApp the owner or manager.'}</p>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-footnote text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={send}
        disabled={!text.trim() || sending}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed disabled:opacity-50"
      >
        {sending ? 'Sending' : 'Send'}
      </button>
    </div>
  );
}
