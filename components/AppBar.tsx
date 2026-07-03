'use client';

// The always-present slim top bar (scope/docs/11-brand.md). Wordmark + the
// always-reachable panic control on every screen; the "errata sheet" tagline
// belongs to the landing's louder register and appears nowhere else, so it is
// gated on the route. Deniable by design — nothing here names what the tool does.

import { usePathname } from 'next/navigation';
import { PanicButton } from './PanicButton';

export function AppBar() {
  const onLanding = usePathname() === '/';
  return (
    <header className="app-bar">
      <span className="wordmark">
        errata <span className="caret" aria-hidden="true">‸</span>
      </span>
      {onLanding && (
        <p className="app-tagline">
          a published list of corrections · no account · no server · no trace
        </p>
      )}
      {/* Always reachable, every screen. */}
      <PanicButton />
    </header>
  );
}
