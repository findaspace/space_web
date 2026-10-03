'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { bookingStatus, startPayment } from '../actions';

export function PayButton({ bookingId, label }: { bookingId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pay() {
    setBusy(true);
    setError(undefined);
    const res = await startPayment(bookingId);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    window.location.assign(res.data.url);
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-md bg-action px-6 text-headline text-on-action active:bg-action-pressed disabled:opacity-50"
      >
        {busy ? 'Opening payment' : label}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-footnote text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// How long to wait for the webhook before saying so. Paystack usually confirms
// within seconds; mobile money can take longer while the guest approves the
// prompt on their phone.
const PATIENCE_MS = 90_000;

// ConfirmWatcher runs after Paystack sends the guest back.
//
// Arriving here proves nothing: the guest may have paid, cancelled, or closed
// the tab on a phone that then reopened this page. Only the webhook, which
// space_api verifies by its signature, confirms a payment. So this watches the
// booking's real status and refreshes the page the moment it changes, and it
// never tells anyone they have paid until the API says so.
export function ConfirmWatcher({ bookingId, from }: { bookingId: string; from: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    const poll = async () => {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 2000));
        if (stopped) return;
        const res = await bookingStatus(bookingId);
        if (res.ok && res.data !== from) {
          router.refresh();
          return;
        }
        if (Date.now() - started > PATIENCE_MS) {
          setGaveUp(true);
          return;
        }
      }
    };
    void poll();
    return () => {
      stopped = true;
    };
  }, [bookingId, from, router]);

  return gaveUp ? (
    <p className="text-body text-ink-muted">
      No confirmation from Paystack yet. If you cancelled, you can pay again below. If money left your account, it
      will confirm on its own: this page updates when it does, and nothing is charged twice.
    </p>
  ) : (
    <p className="flex items-center gap-3 text-body text-ink-muted" aria-live="polite">
      <span className="size-4 animate-spin rounded-full border-2 border-state border-t-transparent" aria-hidden="true" />
      Confirming your payment with Paystack
    </p>
  );
}
