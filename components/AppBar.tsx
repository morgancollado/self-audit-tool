'use client';

// The always-present slim top bar (scope/docs/11-brand.md). Wordmark + the
// always-reachable panic control on every screen; the "errata sheet" tagline
// belongs to the landing's louder register and appears nowhere else, so it is
// gated on the route. Deniable by design — nothing here names what the tool does.

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { PanicButton } from './PanicButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Caret } from './Caret';

export function AppBar() {
  const t = useTranslations('appBar');
  // i18n-aware usePathname strips the locale prefix, so '/' is the landing in
  // either language.
  const onLanding = usePathname() === '/';
  return (
    <header className="app-bar">
      <span className="wordmark">
        errata <Caret className="caret" />
      </span>
      {/* "no trace" would overclaim — the panic wipe can't erase browser history
          (the landing footnote scopes this honestly), so the tagline doesn't
          promise it either. */}
      {onLanding && <p className="app-tagline">{t('tagline')}</p>}
      <LanguageSwitcher />
      {/* Always reachable, every screen. */}
      <PanicButton />
    </header>
  );
}
