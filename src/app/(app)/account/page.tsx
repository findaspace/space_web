import type { Metadata } from 'next';
import Link from 'next/link';

import { logout } from '@/app/(auth)/login/actions';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

import { NameForm } from './name-form';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false },
};

const joined = new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric' });

export default async function AccountPage() {
  const user = await requireUser('/account');

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-md px-4 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <h1 className="text-large-title">Account</h1>

      {/* The grouped inset list: iOS Settings, and the pattern people in this
          market already know from their own phones. */}
      <dl className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <Row label="Phone" value={user.phone} tabular />
        <Row label="Member since" value={joined.format(new Date(user.created_at))} />
        <Row label="Phone status" value="Verified" />
      </dl>

      <div className="mt-6">
        <NameForm current={user.display_name} />
      </div>

      {features.payments ? (
      <Link
        href="/bookings"
        className="mt-6 flex min-h-11 items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-body active:bg-sunk"
      >
        My bookings <span className="text-ink-subtle">›</span>
      </Link>
      ) : null}

      <Link
        href="/hosting"
        className="mt-3 flex min-h-11 items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-body active:bg-sunk"
      >
        My listings <span className="text-ink-subtle">›</span>
      </Link>

      <Link href="/saved" className="mt-3 flex min-h-12 items-center justify-between rounded-lg border border-line px-4 text-body">Saved spaces <span>›</span></Link>
      <Link href="/post" className="primary-button mt-5 w-full">List your space</Link>
      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="h-12 w-full rounded-md border border-line bg-surface text-headline text-danger"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}

function Row({
  label,
  value,
  tabular = false,
  muted = false,
}: {
  label: string;
  value: string;
  tabular?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-3">
      <dt className="text-body">{label}</dt>
      <dd className={`text-body ${muted ? 'text-ink-subtle' : 'text-ink-muted'} ${tabular ? 'tabular' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
