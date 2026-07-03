// Locale routing (scope/docs/03-architecture.md Decision 5). Locale is the
// LANGUAGE axis only — jurisdiction (which brokers/laws apply) is a separate
// stored preference. `localePrefix: 'always'` keeps both build modes identical:
// the static export cannot run middleware, so nothing here depends on
// request-time locale detection — every page lives at /en/... or /es/... and
// the root '/' is a client-side chooser (app/(root)/page.tsx).

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];
