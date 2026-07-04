// Root layout for the bare '/' path only — the language chooser shim
// (page.tsx here) and the legacy pre-i18n route forwarders. All real screens
// live under app/[locale]/, which is its own root layout with the full safety
// shell. This one stays minimal and neutral: no storage, no app chrome,
// nothing that names what the tool does.

import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import '../globals.css';

export const metadata = {
  title: 'Errata',
  description: 'Find and correct your online exposure.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Dynamic build: reading the middleware's x-nonce forces per-request
  // rendering, which is what makes Next stamp the CSP nonce onto this route's
  // scripts. Without it '/' prerenders nonce-less HTML and the strict-dynamic
  // CSP blocks every script — the chooser's auto-forward silently never runs.
  // Static build: headers() is unavailable under output:'export'; CSP hashes
  // cover the inline scripts instead (scripts/generate-csp-hashes.mjs).
  const nonce =
    process.env.STATIC_EXPORT === '1' ? undefined : ((await headers()).get('x-nonce') ?? undefined);

  return (
    <html lang="en">
      <body>
        {children}
        {nonce ? <span data-nonce={nonce} hidden /> : null}
      </body>
    </html>
  );
}
