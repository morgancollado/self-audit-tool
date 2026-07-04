// Per-request i18n config. Without locale-detection middleware the locale
// reaches here via setRequestLocale() in app/[locale]/layout.tsx — identical in
// the dynamic and static builds. Unknown locales fall back to the default
// rather than throwing; the [locale] layout 404s them before rendering.

import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
