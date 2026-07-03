'use client';

// EN/ES toggle in the app bar. Deniable like everything else in the chrome — a
// language control names nothing. Switching navigates to the same route in the
// other locale and records the choice in Preferences.locale so the '/' chooser
// (app/(root)/page.tsx) honors it next visit; in session-only mode the
// preference simply isn't persisted, by design.

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { useStorage } from '@/lib/storage/StorageProvider';
import { useTranslations } from 'next-intl';

// Language autonyms — each locale's name in itself, never translated.
const AUTONYM: Record<AppLocale, string> = { en: 'English', es: 'Español' };

export function LanguageSwitcher() {
  const t = useTranslations('appBar');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { preferences, savePreferences } = useStorage();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <Link
      className="lang-switch"
      href={pathname}
      locale={other}
      aria-label={t('switchLanguage')}
      lang={other}
      onClick={() => void savePreferences({ ...preferences, locale: other })}
    >
      {AUTONYM[other]}
    </Link>
  );
}
