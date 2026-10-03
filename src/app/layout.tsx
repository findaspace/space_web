import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { RegisterServiceWorker } from '@/components/register-sw';
import { env } from '@/lib/env';
import { site } from '@/lib/site';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.SPACE_SITE_URL),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  // An installed app on iOS: its own name under the icon, full screen, and a
  // status bar that sits over the page's paper colour.
  appleWebApp: { capable: true, title: site.name, statusBarStyle: 'default' },
};

// viewport-fit=cover lets the page draw under the iPhone's rounded corners and
// home indicator; components then pad with env(safe-area-inset-*) themselves.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: site.themeColor,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={site.locale}>
      <body className="bg-paper text-ink antialiased">
        <a href="#main-content" className="sr-only fixed top-3 left-3 z-50 rounded-md bg-ink px-5 py-3 text-paper focus:not-sr-only">Skip to content</a>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
