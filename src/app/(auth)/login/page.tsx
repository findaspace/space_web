import type { Metadata } from 'next';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Wordmark } from '@/components/site-header';
import Link from 'next/link';
import { safeNext } from '@/lib/redirect';
import { ACCESS_COOKIE } from '@/lib/session-cookies';
import { serverApi } from '@/lib/api/server';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/problem';

import { SignInMethods } from '@/components/sign-in-methods';
import { enabledProviders } from '@/lib/oauth';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  // A login page has nothing worth indexing, and a search result pointing at
  // it only confuses people looking for a listing.
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if ((await cookies()).has(ACCESS_COOKIE)) {
    let valid = false;
    try { await unwrap((await serverApi()).GET('/v1/me')); valid = true; }
    catch (error) { if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) throw error; }
    if (valid) redirect(next);
  }
  const providers = enabledProviders();
  return <main id="main-content" className="signin-page">
    <div className="signin-shell">
      <Link prefetch={false} href="/" aria-label="Findaspace home" className="signin-wordmark"><Wordmark /></Link>
      <div className="signin-grid">
        <section className="signin-story" aria-labelledby="signin-story-title">
          <p className="signin-eyebrow">A little room for what’s next.</p>
          <h2 id="signin-story-title">Find your place.<br />Make your move.</h2>
          <p>Keep the spaces you love, talk to owners, and pick up where you left off.</p>
          <div className="signin-editorial-image"><Image src="/editorial/outside.jpg" alt="Sunlit interior with greenery; illustrative photography" fill sizes="(min-width: 900px) 45vw, 1px" /><span>Room for what comes next.</span></div>
          <Link prefetch={false} href="/" className="signin-explore">Just looking? Explore spaces →</Link>
        </section>
        <section className="signin-card" aria-labelledby="signin-title">
          <p className="signin-eyebrow">Your Findaspace</p>
          <h1 id="signin-title">Welcome in.</h1>
          <p className="signin-intro">Choose how you’d like to continue. New here? We’ll create your account along the way.</p>
          {params.error && <p role="alert" className="signin-alert">{params.error === 'connected' ? 'That sign-in method already belongs to another account. Sign in to that account to continue.' : 'We couldn’t finish signing you in. Please try again or choose another method.'}</p>}
          <SignInMethods next={next} />
          {providers.length > 0 && <div className="signin-divider"><span>or</span></div>}
          <details className="signin-phone" open={providers.length === 0 ? true : undefined}>
            <summary>Continue with phone <span aria-hidden="true">＋</span></summary>
            <div className="pt-5"><LoginForm next={next} /></div>
          </details>
          <p className="signin-existing">Already use a phone account? Sign in with that number first, then connect other sign-in methods from your account.</p>
          <Link prefetch={false} href="/safety" className="signin-safety">A few things to know before renting →</Link>
        </section>
      </div>
    </div>
  </main>;
}
