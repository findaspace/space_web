import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Wordmark } from '@/components/site-header';
import Link from 'next/link';
import { safeNext } from '@/lib/redirect';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  // A login page has nothing worth indexing, and a search result pointing at
  // it only confuses people looking for a listing.
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next);

  // Already signed in: skip the form. The proxy has run by now, so a present
  // access cookie means a live session rather than a stale one.
  if ((await cookies()).has(ACCESS_COOKIE)) {
    redirect(next);
  }

  return (
    <main id="main-content" className="mx-auto min-h-dvh max-w-md px-4 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Link href="/" aria-label="Findaspace home" className="mb-10 inline-block"><Wordmark /></Link>
      <LoginForm next={next} />
    </main>
  );
}
