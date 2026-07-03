// Root layout for the bare '/' path only — the language chooser shim
// (page.tsx here). All real screens live under app/[locale]/, which is its own
// root layout with the full safety shell. This one stays minimal and neutral:
// no storage, no app chrome, nothing that names what the tool does.

import type { ReactNode } from 'react';
import '../globals.css';

export const metadata = {
  title: 'Errata',
  description: 'Find and correct your online exposure.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
