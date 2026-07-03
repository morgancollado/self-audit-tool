'use client';

// Settings — storage mode (persistent / session-only) and the encrypted backup.
// Panic-delete lives in the always-visible app bar, not here, so it's reachable
// from every screen. Gated behind the safety intro like the rest of the app.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { BackupPanel } from '@/components/BackupPanel';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
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

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">{tc('backToErrata')}</Link> · <Link href="/playbook">{tc('breadcrumb.playbook')}</Link>
      </p>
      <h1>{t('title')}</h1>

      <h2>{t('storageHead')}</h2>
      <StorageModeToggle />

      <BackupPanel />

      <p className="optout-disclaimer">{t('panicNote')}</p>
    </>
  );
}
