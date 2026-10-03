'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { updateName } from '@/app/(app)/account/actions';
import { createBooking, getQuote, startPayment } from '@/app/(app)/bookings/actions';
import type { components } from '@/lib/api/schema';
import { addDays, firstTakenNight, formatDate, nightsBetween } from '@/lib/booking/dates';
import { formatMinor } from '@/lib/money';

type Quote = components['schemas']['Quote'];

type Props = {
  listing: {
    id: string;
    slug: string;
    mode: 'nightly' | 'term';
    advanceMonths: number;
    maxOccupancy: number;
  };
  taken: string[];
  today: string;
  defaultStart: string;
  // True when the guest has no name yet. The host sees the name on the
  // request, so it is asked for here, once, at the moment it matters.
  needsName: boolean;
};

const MAX_MONTHS = 24;

export function BookForm({ listing, taken, today, defaultStart, needsName }: Props) {
  const router = useRouter();
  const nightly = listing.mode === 'nightly';
  const minMonths = Math.max(listing.advanceMonths, 1);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [startsOn, setStartsOn] = useState(defaultStart);
  const [months, setMonths] = useState(minMonths);
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState('');

  // Each answer is tagged with the exact request it was for, and shown only
  // while that request is still the current one. A quote for dates the guest
  // has since changed is never displayed, not even for the moment before the
  // new one arrives.
  const [answer, setAnswer] = useState<{ key: string; quote?: Quote; error?: string }>({ key: '' });
  const [submitError, setSubmitError] = useState<{ key: string; message: string }>();
  const [submitting, setSubmitting] = useState(false);

  // One key per form, reused by every attempt from it: see createBooking.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const takenSet = useMemo(() => new Set(taken), [taken]);

  // What to ask the API for, or why not to ask yet.
  const request = useMemo(() => {
    if (nightly) {
      if (!checkIn || !checkOut) return { wait: 'Choose your dates to see the price.' };
      if (nightsBetween(checkIn, checkOut) < 1) return { wait: 'Check-out must be after check-in.' };
      const blocked = firstTakenNight(checkIn, checkOut, takenSet);
      if (blocked) return { wait: `The night of ${formatDate(blocked)} is already booked. Choose other dates.` };
      return { input: { checkIn, checkOut, guests } };
    }
    return { input: { startsOn, months, guests } };
  }, [nightly, checkIn, checkOut, startsOn, months, guests, takenSet]);

  const key = request.input ? JSON.stringify(request.input) : '';

  // A live quote as the dates change, debounced so a guest scrolling through a
  // date wheel sends one request, not twenty.
  useEffect(() => {
    if (!request.input) return;
    const input = request.input;
    let stale = false;
    const timer = setTimeout(async () => {
      const res = await getQuote(listing.slug, input);
      if (stale) return;
      setAnswer(
        res.ok
          ? { key, quote: res.data }
          : { key, error: res.signedOut ? 'Your session ended. Refresh the page to sign in again.' : res.error },
      );
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [request, key, listing.slug]);

  const current = key !== '' && answer.key === key ? answer : null;
  const quote = current?.quote ?? null;
  const loadingQuote = key !== '' && !current;
  // A submit error belongs to the dates it was about; new dates clear it.
  const problem = (submitError?.key === key ? submitError.message : undefined) ?? request.wait ?? current?.error;

  async function submit() {
    if (!request.input || !quote) return;
    setSubmitting(true);
    setSubmitError(undefined);

    if (needsName) {
      const named = await updateName(name);
      if (!named.ok) {
        setSubmitting(false);
        setSubmitError({ key, message: named.error });
        return;
      }
    }

    const created = await createBooking(listing.id, request.input, idempotencyKey);
    if (!created.ok) {
      setSubmitting(false);
      setSubmitError({ key, message: created.error });
      return;
    }

    // A lease waits for the host; there is nothing to pay yet.
    if (!nightly) {
      router.push(`/bookings/${created.data.id}`);
      return;
    }

    const payment = await startPayment(created.data.id);
    if (!payment.ok) {
      // The dates are held regardless. The booking page can start payment
      // again, so send the guest there rather than leave them stranded.
      router.push(`/bookings/${created.data.id}`);
      return;
    }
    window.location.assign(payment.data.url);
  }

  const due = quote?.due_now_minor;
  const lines = quote?.lines.filter((l) => l.code !== 'rent') ?? [];

  return (
    <div>
      {nightly ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in">
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1));
              }}
              className={input}
            />
          </Field>
          <Field label="Check-out">
            <input
              type="date"
              value={checkOut}
              min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
              onChange={(e) => setCheckOut(e.target.value)}
              className={input}
            />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Move in">
            <input type="date" value={startsOn} min={today} onChange={(e) => setStartsOn(e.target.value)} className={input} />
          </Field>
          <Field label="For how long">
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={input}>
              {Array.from({ length: MAX_MONTHS - minMonths + 1 }, (_, i) => minMonths + i).map((m) => (
                <option key={m} value={m}>
                  {m} month{m === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field label="Guests">
        <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={input}>
          {Array.from({ length: Math.max(listing.maxOccupancy, 1) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>

      {!nightly && listing.advanceMonths > 1 ? (
        <p className="mt-2 text-footnote text-ink-muted">
          This host asks for {listing.advanceMonths} months of rent upfront, so the shortest lease is {minMonths} months.
        </p>
      ) : null}

      {needsName ? (
        <Field label="Your name">
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className={input} />
          <span className="mt-1 block text-footnote text-ink-subtle">The host sees this with your {nightly ? 'reservation' : 'request'}.</span>
        </Field>
      ) : null}

      <section aria-live="polite" className="mt-6 rounded-lg border border-line bg-surface p-4">
        {quote ? (
          <>
            <dl className="space-y-2 text-subheadline">
              {lines.map((l) => (
                <div key={l.code} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{l.label}</dt>
                  <dd className="tabular">{formatMinor(l.amount_minor)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex justify-between gap-4 border-t border-line pt-3 text-headline">
              <span>{nightly ? 'Total' : 'Due if approved'}</span>
              <span className="tabular">{due !== undefined ? formatMinor(due) : ''}</span>
            </div>
          </>
        ) : (
          <p className="text-subheadline text-ink-muted">{loadingQuote ? 'Working out the price' : problem}</p>
        )}
      </section>

      {quote && problem ? (
        <p role="alert" className="mt-3 text-footnote text-danger">
          {problem}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!quote || submitting || (needsName && name.trim().length < 2)}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed disabled:opacity-50"
      >
        {submitting ? (nightly ? 'Reserving' : 'Sending') : nightly ? 'Reserve and pay' : 'Request to rent'}
      </button>
      <p className="mt-3 text-center text-footnote text-ink-subtle">
        {nightly
          ? 'You pay on the next screen, with mobile money or card.'
          : 'You pay nothing now. The host approves first, then you pay.'}
      </p>
    </div>
  );
}

const input = 'h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-body';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1 block text-footnote text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
