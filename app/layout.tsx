// Root layout. Demonstrates correct nonce wiring (dynamic build) and mounts the
// safety shell: the storage provider plus the always-visible panic control.

import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import './globals.css';
import { StorageProvider } from '@/lib/storage/StorageProvider';
import { PanicButton } from '@/components/PanicButton';

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
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StorageProvider>
          <header className="app-bar">
            <span className="wordmark">errata</span>
            {/* Always reachable, every screen. */}
            <PanicButton />
          </header>
          <main id="main">{children}</main>
        </StorageProvider>
        {nonce ? <span data-nonce={nonce} hidden /> : null}
      </body>
    </html>
  );
}
