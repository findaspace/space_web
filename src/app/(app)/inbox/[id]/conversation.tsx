'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { components } from '@/lib/api/schema';
import { looksLikeContact, mergeMessages } from '@/lib/inbox/messages';
import { site } from '@/lib/site';

import { markThreadRead, messagePage, reply } from '../actions';

type Message = components['schemas']['Message'];

// How often to look for new messages while the conversation is on screen.
const POLL_MS = 5000;

const time = new Intl.DateTimeFormat('en-GH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Accra' });

export function Conversation({
  threadId,
  viewerId,
  initial,
  initialBefore,
  paymentsEnabled = false,
}: {
  threadId: string;
  viewerId: string;
  initial: Message[];
  initialBefore?: string;
  paymentsEnabled?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [before, setBefore] = useState(initialBefore);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string>();
  const bottom = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await messagePage(threadId);
    if (!res.ok) return;
    setMessages((current) => {
      const merged = mergeMessages(current, res.data.messages);
      // Something new from the other person while this is on screen means it
      // has been read; the dot in the inbox should say so.
      if (merged.length !== current.length && merged.at(-1)?.sender_id !== viewerId) {
        void markThreadRead(threadId);
      }
      return merged;
    });
  }, [threadId, viewerId]);

  // Polling, paused while the tab is hidden: a phone in a pocket with this
  // page open should cost nothing. Returning to the tab checks at once.
  useEffect(() => {
    void markThreadRead(threadId);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [threadId, refresh]);

  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  async function send() {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(undefined);
    const res = await reply(threadId, draft);
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessages((current) => mergeMessages(current, [res.data]));
    setDraft('');
  }

  async function older() {
    if (!before) return;
    setLoadingOlder(true);
    const res = await messagePage(threadId, before);
    setLoadingOlder(false);
    if (!res.ok) return;
    setMessages((current) => mergeMessages(current, res.data.messages));
    setBefore(res.data.nextBefore);
  }

  const warn = paymentsEnabled && looksLikeContact(draft);

  return (
    <div className="flex flex-col">
      {before ? (
        <button type="button" onClick={older} disabled={loadingOlder} className="mx-auto mb-4 min-h-11 text-subheadline font-semibold text-state-ink">
          {loadingOlder ? 'Loading' : 'Earlier messages'}
        </button>
      ) : null}

      <ol className="flex flex-col gap-2" aria-live="polite">
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          return (
            <li key={m.id} className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
              {/* Mine in the pale blue with dark text: white on the brand blue
                  fails contrast, and these are the words people read most. */}
              <p
                className={`rounded-lg px-3.5 py-2 text-body whitespace-pre-wrap ${
                  mine ? 'bg-state-wash text-ink' : 'border border-line bg-surface text-ink'
                }`}
              >
                {m.body}
              </p>
              <span className="tabular mt-0.5 px-1 text-caption text-ink-subtle">{time.format(new Date(m.created_at))}</span>
              {m.redacted ? (
                <span className="px-1 text-caption text-ink-muted">{paymentsEnabled ? 'Contact details hidden until a booking is paid.' : 'Contact details hidden. Use the contact options on the listing.'}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div ref={bottom} />

      <div className="sticky bottom-0 mt-4 border-t border-line bg-paper pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {warn ? (
          <p className="mb-2 text-footnote text-ink-muted">
            {paymentsEnabled ? `Phone numbers, emails and links are hidden until a booking is paid. Keep talking here on ${site.name}.` : 'Contact details may be hidden in messages. Use the listing’s contact options to call or WhatsApp the owner or manager.'}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends on a keyboard; on a phone the return key makes a new line.
                if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Write a message"
              className="max-h-40 min-h-12 w-full resize-none rounded-lg border border-line-strong bg-surface px-4 py-3 text-body [field-sizing:content]"
            />
          </label>
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className="h-12 shrink-0 rounded-md bg-action px-5 text-headline text-on-action active:bg-action-pressed disabled:opacity-50"
          >
            {sending ? 'Sending' : 'Send'}
          </button>
        </div>
        {error ? <p role="alert" className="mt-2 text-footnote text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
