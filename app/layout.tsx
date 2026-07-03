// Root layout. Demonstrates correct nonce wiring (dynamic build) and mounts the
// safety shell: the storage provider plus the always-visible panic control.

import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import './globals.css';
import { StorageProvider } from '@/lib/storage/StorageProvider';
import { AppBar } from '@/components/AppBar';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Errata',
  description: 'Find and correct your online exposure.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Dynamic build: middleware sets x-nonce, read here. Static build: we must NOT
  // call headers() (it forces dynamic rendering, which is incompatible with
  // output:'export') — CSP comes from build-time hashes instead.
  const nonce =
    process.env.STATIC_EXPORT === '1' ? undefined : ((await headers()).get('x-nonce') ?? undefined);

  return (
    <html lang="en">
      <body>
        {/* Preload the two faces that paint above the fold on every screen (the
            serif wordmark/headings + the mono metadata voice); React hoists
            these into <head>. Same-origin, so still no phone-home. */}
        <link
          rel="preload"
          href="/fonts/Newsreader-Medium500.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IBMPlexMono-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StorageProvider>
          <AppBar />
          {/* Two-column grid: a left "margin" gutter (aria-hidden, decorative)
              and the reading column. Below 46rem the gutter collapses and the
              column is full-width — content never depends on the gutter. */}
          <main id="main">
            <div className="main-col">{children}</div>
          </main>
          <Footer />
        </StorageProvider>
        {nonce ? <span data-nonce={nonce} hidden /> : null}
      </body>
    </html>
  );
}
