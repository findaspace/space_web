import type { Metadata } from 'next';
import Link from 'next/link';

import { logout } from '@/app/(auth)/login/actions';
import { InstallApp } from '@/components/install-app';
import { features } from '@/lib/features';
import { requireUser } from '@/lib/session';

import { SignInMethods } from '@/components/sign-in-methods';
import { enabledProviders } from '@/lib/oauth';
import { unwrap } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import { PhoneForm } from './phone-form';
import { DeleteAccount } from './delete-account';
import { NameForm } from './name-form';

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false },
};

const joined = new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric' });

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser('/account');
  const methods = await unwrap((await serverApi()).GET('/v1/me/sign-in-methods'));
  const error = (await searchParams).error;

  return (
    <main id="main-content" className="account-page mx-auto min-h-dvh max-w-2xl px-5 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <p className="eyebrow text-ink-muted">Your Findaspace</p><h1 className="text-large-title mt-3">Account</h1><p className="mt-3 text-subheadline text-ink-muted">Your details. Your spaces. Your next move.</p>
      <InstallApp />

      {/* The grouped inset list: iOS Settings, and the pattern people in this
          market already know from their own phones. */}
      <dl className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <Row label="Phone" value={user.phone || 'Not connected'} tabular />
        <Row label="Member since" value={joined.format(new Date(user.created_at))} />
        <Row label="Phone status" value={user.phone_verified ? 'Verified' : 'Not verified'} />
      </dl>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5" aria-labelledby="sign-in-methods-title">
        <h2 id="sign-in-methods-title" className="text-title-2">Ways to sign in</h2>
        <p className="mt-2 mb-4 text-footnote leading-6 text-ink-muted">Connect another method to this account. For your protection, sign in again first if your last sign-in was more than 15 minutes ago.</p>
        {error && <p role="alert" className="mb-4 text-footnote text-danger">{error === 'connected' ? 'That method belongs to another account. We haven’t merged or changed either account.' : error === 'reauth' ? 'Please sign out and sign in again, then connect the method.' : 'We couldn’t connect that method. Try signing in again before retrying.'}</p>}
        {enabledProviders().length > 0 ? <SignInMethods link connected={methods.methods} /> : <p className="text-footnote text-ink-muted">More sign-in options will appear here when available.</p>}
        {!user.phone_verified && <><p className="mt-5 text-footnote leading-6 text-ink-muted">Add a verified phone when you’re ready to publish a listing. You can also use it to sign in.</p><PhoneForm /></>}
      </section>
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

      {user.roles?.some((role) => role === 'admin' || role === 'support') && <Link href="/staff/reports" className="secondary-button mt-5 w-full">Review listing reports</Link>}
      <Link href="/saved" className="mt-3 flex min-h-12 items-center justify-between rounded-lg border border-line px-4 text-body">Saved spaces <span>›</span></Link>
      <Link href="/post" className="primary-button mt-5 w-full">List your space</Link>
      <DeleteAccount />
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
