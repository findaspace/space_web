import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';
import { TabBar } from '@/components/tab-bar';

// Signed-in pages get the same header as the public ones, so the inbox, the
// bell and the way home are always one tap away. Everything under this layout
// requires a session, so the header can assume one.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader signedIn />
      <div className="pb-20 md:pb-0">{children}</div>
      <TabBar signedIn />
    </>
  );
}
