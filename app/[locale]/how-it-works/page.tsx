// Public "how it works / privacy" page. This is the trust document a person
// reads BEFORE deciding to use Errata, so it is deliberately NOT gated behind
// the safety intro and touches no storage — a pure static page with no client
// JS, no hooks, nothing that phones home. Plain, calm, honest about the edges
// (scope/docs/06-risk-register.md, /11-brand.md). Every claim here must stay
// true to the architecture; if the architecture changes, this page changes.

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
const em = (chunks: React.ReactNode) => <em>{chunks}</em>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'howItWorks' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('howItWorks');
  const tc = await getTranslations('common');

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">{tc('backToErrata')}</Link>
      </p>

      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>

      <h2>{t('deviceHead')}</h2>
      <p>{t('deviceBody')}</p>

      <h2>{t('neverHead')}</h2>
      <ul>
        <li>{t('never1')}</li>
        <li>{t('never2')}</li>
        <li>{t('never3')}</li>
        <li>{t('never4')}</li>
        <li>{t('never5')}</li>
      </ul>

      <section className="info-card" aria-labelledby="one-thing">
        <h2 id="one-thing">{t('oneThingHead')}</h2>
        <p>{t.rich('oneThingBody', { strong })}</p>
      </section>

      <h2>{t('savedHead')}</h2>
      <p>{t.rich('savedBody1', { strong })}</p>
      <p>
        {t.rich('savedBody2', {
          link: (chunks) => <Link href="/settings">{chunks}</Link>,
        })}
      </p>

      <h2>{t('clearHead')}</h2>
      <p>{t('clearBody1')}</p>
      <p>{t('clearBody2')}</p>

      <h2>{t('cantHead')}</h2>
      <p>{t('cantIntro')}</p>
      <ul>
        <li>{t.rich('cant1', { strong })}</li>
        <li>{t.rich('cant2', { em })}</li>
        <li>{t.rich('cant3', { strong })}</li>
      </ul>

      <h2>{t('openHead')}</h2>
      <p>{t('openBody1')}</p>
      <p>
        {t.rich('openBody2', {
          github: (chunks) => (
            <a href="https://github.com/morgancollado/self-audit-tool" target="_blank" rel="noreferrer">
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2>{t('legalHead')}</h2>
      <p className="optout-disclaimer">{t('legalBody')}</p>

      <section className="info-card" aria-labelledby="support">
        <h2 id="support">{t('supportHead')}</h2>
        <p>{t('supportIntro')}</p>
        <ul>
          <li>
            {t.rich('supportTransLifeline', {
              strong,
              phone: (chunks) => <a href="tel:+18775658860">{chunks}</a>,
              site: (chunks) => (
                <a href="https://translifeline.org" target="_blank" rel="noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </li>
          <li>
            {t.rich('supportAccessNow', {
              strong,
              site: (chunks) => (
                <a href="https://www.accessnow.org/help/" target="_blank" rel="noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </li>
        </ul>
      </section>

      <p className="breadcrumb">
        <Link href="/">{t('backLink')}</Link>
      </p>
    </>
  );
}
