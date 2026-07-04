'use client';

// Phase 2 — Public records & legal name change (US/global). The deadname's most
// permanent sources: the indexed court order, the name-change petition's
// publication, web archives, and search caches. Gated behind the safety intro
// like the other Phase 2 flows. Region-aware (court records are sub-national) and
// carries the standing not-yet-reviewed / verify-locally banner — name-change and
// sealing content is gated on legal review (R4/R11).

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getRecords } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { StateSelect } from '@/components/StateSelect';
import { RecordGuide } from '@/components/RecordGuide';
import { RemediationTracker } from '@/components/RemediationTracker';

export default function RecordsPage() {
  const t = useTranslations('records');
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

  const jurisdiction = preferences.jurisdiction ?? { country: 'us' as const };
  const records = getRecords(jurisdiction, locale);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">{tc('backToErrata')}</Link> · <Link href="/playbook">{tc('breadcrumb.playbook')}</Link> ·{' '}
        <Link href="/discover">{tc('breadcrumb.discover')}</Link> · <Link href="/remediate">{tc('breadcrumb.remediate')}</Link> ·{' '}
        <Link href="/harden">{tc('breadcrumb.harden')}</Link>
      </p>
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>

      <StorageModeToggle />

      <p className="rights-banner" role="note">
        {t('banner')}
      </p>

      <StateSelect note={t('stateNote')} />

      <div className="record-list">
        {records.map((r) => (
          <RecordGuide key={r.slug} record={r} />
        ))}
      </div>

      <RemediationTracker />
    </>
  );
}
