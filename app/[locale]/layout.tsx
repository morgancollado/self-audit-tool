// Locale root layout. One of two root layouts (the other is app/(root)/ — the
// bare '/' language chooser): every real screen lives under /en or /es, so this
// layout owns <html lang>, the CSP nonce wiring, and the safety shell (storage
// provider + always-visible panic control).

import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';
import { StorageProvider } from '@/lib/storage/StorageProvider';
import { AppBar } from '@/components/AppBar';
import { Footer } from '@/components/Footer';

// Both locales are pre-rendered; anything else is a plain 404, in both build
// modes (the static export can only ever contain /en and /es anyway).
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: 'Errata',
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Distributes the locale to server components in both build modes — this is
  // what lets the static export render without request-time locale detection.
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations('layout');

  // Dynamic build: middleware sets x-nonce, read here. Static build: we must NOT
  // call headers() (it forces dynamic rendering, which is incompatible with
  // output:'export') — CSP comes from build-time hashes instead.
  const nonce =
    process.env.STATIC_EXPORT === '1' ? undefined : ((await headers()).get('x-nonce') ?? undefined);

  return (
    <html lang={locale}>
      <body>
        {/* Preload the two faces that paint above the fold on every screen (the
            serif wordmark/headings + the mono metadata voice); React hoists
            these into <head>. Same-origin, so still no phone-home. */}
        <link
          rel="preload"
          href="/fonts/Newsreader-Medium500.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IBMPlexMono-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <a className="skip-link" href="#main">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StorageProvider>
            <AppBar />
            {/* Two-column grid: a left "margin" gutter (aria-hidden, decorative)
                and the reading column. Below 46rem the gutter collapses and the
                column is full-width — content never depends on the gutter. */}
            <main id="main">
              <div className="main-col">{children}</div>
            </main>
            <Footer />
          </StorageProvider>
        </NextIntlClientProvider>
        {nonce ? <span data-nonce={nonce} hidden /> : null}
      </body>
    </html>
  );
}
