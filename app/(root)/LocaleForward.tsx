'use client';

// Client-side locale forwarder shared by the bare '/' chooser and the legacy
// pre-i18n routes (/discover etc., bookmarked before screens moved under
// /en|/es — a returning user's saved tracker link must keep working).
// Preference order: the stored locale (set by the switcher in the app bar),
// then the browser language, then English. This replaces middleware locale
// detection ON PURPOSE: the static export can't run middleware, and both build
// modes must behave identically (i18n/routing.ts). While the redirect runs (or
// with JS off) the page shows the two locale links — neutral and deniable,
// like everything outside the flows.

import { useEffect } from 'react';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { storedLocaleHint } from '@/lib/storage/locale-hint';

function pickLocale(): string {
  const stored = storedLocaleHint();
  if (hasLocale(routing.locales, stored)) return stored;
  const nav = (navigator.language || '').toLowerCase();
  const byBrowser = routing.locales.find((l) => nav === l || nav.startsWith(`${l}-`));
  return byBrowser ?? routing.defaultLocale;
}

export function LocaleForward({ path = '' }: { path?: string }) {
  useEffect(() => {
    // replace(), not push — the prefixless URL must not sit in history
    // between screens.
    window.location.replace(`/${pickLocale()}${path}`);
  }, [path]);

  return (
    <main id="main">
      <div className="main-col">
        <p className="landing-jump-lead">
          <a href={`/en${path}`} lang="en">
            English
          </a>{' '}
          ·{' '}
          <a href={`/es${path}`} lang="es">
            Español
          </a>
        </p>
      </div>
    </main>
  );
}
