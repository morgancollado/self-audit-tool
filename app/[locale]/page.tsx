'use client';

// M0 landing — the "errata sheet" register (scope/docs/11-brand.md): a louder,
// editorial front page that appears nowhere else in the app. The first-run safety
// intro is NOT shown here: it opens the moment the visitor clicks into a flow
// ("Begin the correction" → /playbook, etc.), which is where the shared-device
// choice actually matters and where the sensitive inputs live. The app still
// starts session-only and writes nothing until that choice is made. The
// storage-mode control + jump links appear once the intro has been acknowledged.
// Deniable by design: nothing on screen names the tool's purpose.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { Caret } from '@/components/Caret';

export default function HomePage() {
  const t = useTranslations('landing');
  const tc = useTranslations('common');
  const { ready, preferences } = useStorage();

  if (!ready) {
    return <p>{tc('loading')}</p>;
  }

  return (
    <div className="landing">
      <div className="landing-inner">
        <section className="hero" aria-labelledby="hero-head">
          <h1 className="hero-head" id="hero-head" aria-label={t('heroAria')}>
            <span aria-hidden="true">{t('heroPrefix')}</span>
            <span className="strike-wrap" aria-hidden="true">
              <span className="strike-new">
                {t('heroNew')}
                <span className="strike-caret">
                  <Caret />
                </span>
              </span>
              <span className="strike-old">
                {t('heroOld')}
                <span className="strike-rule" />
              </span>
            </span>
            <span aria-hidden="true">.</span>
          </h1>

          <p className="hero-support">{t('heroSupport')}</p>

          <div className="hero-actions">
            <Link className="btn-primary" href="/playbook">
              {t('begin')}
            </Link>
            <Link className="btn-secondary" href="/how-it-works">
              {t('readHow')}
            </Link>
          </div>
        </section>

        {preferences.safetyIntroAcknowledged && (
          <nav className="landing-jump" aria-label={t('jumpAria')}>
            <p className="landing-jump-lead">{t('jumpLead')}</p>
            <ul>
              <li>
                <Link href="/discover">{t('jumpDiscover')}</Link>
              </li>
              <li>
                {t('jumpRemediateLead')} <Link href="/remediate">{t('jumpRemediate')}</Link>
              </li>
              <li>
                {t('jumpHardenLead')} <Link href="/harden">{t('jumpHarden')}</Link>
              </li>
              <li>
                {t('jumpRecordsLead')} <Link href="/records">{t('jumpRecords')}</Link>
              </li>
              <li>
                <Link href="/settings">{t('jumpSettings')}</Link>
              </li>
            </ul>
            <StorageModeToggle />
          </nav>
        )}
      </div>

      <section className="drop-plate" aria-labelledby="drop-head">
        <div className="landing-inner drop-inner">
          <div className="drop-text">
            <p className="drop-kicker">{t('dropKicker')}</p>
            <h2 id="drop-head">{t('dropHead')}</h2>
            <p className="drop-body">{t('dropBody')}</p>
          </div>
          <Link className="btn-cream" href="/remediate">
            {t('dropCta')}
          </Link>
        </div>
      </section>

      <div className="landing-inner">
        <ol className="footnotes">
          <li>
            <span className="footnote-num" aria-hidden="true">
              1
            </span>
            {t('footnote1')}
          </li>
          <li>
            <span className="footnote-num" aria-hidden="true">
              2
            </span>
            {t('footnote2')}
          </li>
        </ol>
      </div>
    </div>
  );
}
