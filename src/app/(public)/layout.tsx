import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TabBar } from '@/components/tab-bar';
import { env } from '@/lib/env';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const signedIn = (await cookies()).has(ACCESS_COOKIE);
  return (
    <div className="public-layout">
      {env.SPACE_DEMO_MODE && <aside aria-label="Design preview" className="bg-sunk px-4 py-2 text-center text-caption text-ink-muted">Design preview · Fictional listings and sample photos</aside>}
      <SiteHeader signedIn={signedIn} />
      {children}
      <SiteFooter />
      <TabBar signedIn={signedIn} />
    </div>
  );
}
