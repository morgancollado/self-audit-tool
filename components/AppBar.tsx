'use client';

// The always-present slim top bar (scope/docs/11-brand.md). Wordmark + the
// always-reachable panic control on every screen; the "errata sheet" tagline
// belongs to the landing's louder register and appears nowhere else, so it is
// gated on the route. Deniable by design — nothing here names what the tool does.

import { usePathname } from 'next/navigation';
import { PanicButton } from './PanicButton';
import { Caret } from './Caret';

export function AppBar() {
  const onLanding = usePathname() === '/';
  return (
    <header className="app-bar">
      <span className="wordmark">
        errata <Caret className="caret" />
      </span>
      {/* "no trace" would overclaim — the panic wipe can't erase browser history
          (the landing footnote scopes this honestly), so the tagline doesn't
          promise it either. */}
      {onLanding && (
        <p className="app-tagline">
          a published list of corrections · no account · no server
        </p>
      )}
      {/* Always reachable, every screen. */}
      <PanicButton />
    </header>
  );
}
