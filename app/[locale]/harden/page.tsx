'use client';

// Phase 2 — Platform hardening & deadname removal (US/global). Guided,
// click-by-click flows for the major platforms, with deadname-removal first.
// Gated behind the shared-device safety intro like /discover and /remediate, and
// shares the remediation tracker so platform actions land in the same record.

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getPlatforms } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { PlatformGuide } from '@/components/PlatformGuide';
import { RemediationTracker } from '@/components/RemediationTracker';

export default function HardenPage() {
  const t = useTranslations('harden');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { ready, preferences } = useStorage();

  if (!ready) return <p>{tc('loading')}</p>;

  if (!preferences.safetyIntroAcknowledged) {
    return (
      <>
        <p className="breadcrumb">
          <Link href="/">{tc('backToErrata')}</Link>
        </p>
        <SafetyIntro />
      </>
    );
  }

  const platforms = getPlatforms(locale);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">{tc('backToErrata')}</Link> · <Link href="/playbook">{tc('breadcrumb.playbook')}</Link> ·{' '}
        <Link href="/discover">{tc('breadcrumb.discover')}</Link> · <Link href="/remediate">{tc('breadcrumb.remediate')}</Link>
      </p>
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>

      <StorageModeToggle />

      <div className="platform-list">
        {platforms.map((p) => (
          <PlatformGuide key={p.slug} platform={p} />
        ))}
      </div>

      <p className="discover-next">
        {t.rich('nextRecords', {
          link: (chunks) => <Link href="/records">{chunks}</Link>,
        })}
      </p>

      <RemediationTracker />
    </>
  );
}
