// Minimal root layout (M0 seed). Its job here is to demonstrate correct nonce
// wiring; the real shell (safety intro, panic-delete, ephemeral toggle) lands
// in M0 proper per scope/docs/07-roadmap.md.

import type { ReactNode } from 'react';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Errata',
  description: 'Find and correct your online exposure.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // In the dynamic build, middleware sets x-nonce. In the static build there is
  // no nonce (hashes are used instead) and this is simply undefined.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <body>
        {children}
        {/*
          Any inline <script> we ever add MUST carry nonce={nonce} so it is
          allowed by the CSP. Prefer external modules over inline scripts.
        */}
      </body>
    </html>
  );
}
