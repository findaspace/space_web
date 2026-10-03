import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';
import { serverApi } from '@/lib/api/server';
import { maskNumber, networkLabel } from '@/lib/hosting/momo';
import { formatMinor } from '@/lib/money';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

import { AccountForm, ChangeAccount, WithdrawForm } from './payout-forms';

export const metadata: Metadata = { title: 'Payouts', robots: { index: false } };

const on = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Accra' });

const STATUS: Record<string, string> = {
  pending: 'Processing',
  processing: 'Processing',
  paid: 'Paid',
  succeeded: 'Paid',
  failed: 'Failed',
  reversed: 'Returned',
};

async function orNull<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work;
  } catch (err) {
    // No account yet is a 404; a first-time host whose session predates their
    // first listing can see a 403 until it refreshes. Both mean "nothing to
    // show yet", not a broken page.
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}

export default async function PayoutsPage() {

  // Read the request first. Checked before anything dynamic, the switch made
  // Next.js prerender this page at build time, baking in whatever the setting
  // was then and caching it for a year: flipping it later would do nothing.
  await connection();
  if (!features.payments) notFound();
  await requireUser('/hosting/payouts');
  const client = await serverApi();
  const [balance, account, history] = await Promise.all([
    orNull(unwrap(client.GET('/v1/payouts/balance'))),
    orNull(unwrap(client.GET('/v1/payouts/account'))),
    orNull(unwrap(client.GET('/v1/payouts'))),
  ]);

  const withdrawable = balance?.withdrawable_minor ?? 0;
  const payouts = history?.payouts ?? [];

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-10">
      <Link href="/hosting" className="text-subheadline font-semibold text-state-ink">
        Hosting
      </Link>
      <h1 className="mt-3 text-large-title">Payouts</h1>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5">
        <p className="text-footnote text-ink-muted">Ready to withdraw</p>
        <p className="tabular mt-1 text-large-title">{formatMinor(withdrawable)}</p>
        {/* The host's side of escrow: money guests have already paid, which
            is released once they have moved in. Shown so a host knows it is
            coming and why it is not withdrawable yet. */}
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-subheadline">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Held until guests move in</dt>
            <dd className="tabular">{formatMinor(balance?.pending_minor ?? 0)}</dd>
          </div>
          {balance && balance.in_flight_minor > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">On its way to you</dt>
              <dd className="tabular">{formatMinor(balance.in_flight_minor)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-title-3">Where we pay you</h2>
        <div className="mt-3 rounded-lg border border-line bg-surface p-4">
          {account ? (
            <>
              <p className="text-headline">
                {networkLabel(account.bank_code)} {maskNumber(account.account_number)}
              </p>
              <p className="text-footnote text-ink-muted">{account.account_name}</p>
              <ChangeAccount />
            </>
          ) : (
            <>
              <p className="mb-4 text-body text-ink-muted">Add a mobile money number to receive your earnings.</p>
              <AccountForm />
            </>
          )}
        </div>
      </section>

      {account && withdrawable >= 100 ? (
        <section className="mt-8">
          <h2 className="text-title-3">Withdraw</h2>
          <div className="mt-3">
            <WithdrawForm withdrawable={(withdrawable / 100).toFixed(2).replace(/\.00$/, '')} />
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-title-3">History</h2>
        {payouts.length === 0 ? (
          <p className="mt-2 text-body text-ink-muted">No payouts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {payouts.map((p) => (
              <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="tabular text-headline">{formatMinor(p.amount_minor)}</p>
                  <p className="text-footnote text-ink-muted">
                    {on.format(new Date(p.created_at))}
                    {p.failure_reason ? ` · ${p.failure_reason}` : ''}
                  </p>
                </div>
                <span className={`text-footnote font-semibold ${p.status === 'failed' || p.status === 'reversed' ? 'text-danger' : 'text-ink-muted'}`}>
                  {STATUS[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
