'use client';

// Settings — storage mode (persistent / session-only) and the encrypted backup.
// Panic-delete lives in the always-visible app bar, not here, so it's reachable
// from every screen. Gated behind the safety intro like the rest of the app.

import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { BackupPanel } from '@/components/BackupPanel';

export default function SettingsPage() {
  const { ready, preferences } = useStorage();

  if (!ready) return <p>Loading…</p>;

  if (!preferences.safetyIntroAcknowledged) {
    return (
      <>
        <p className="breadcrumb">
          <Link href="/">← Errata</Link>
        </p>
        <SafetyIntro />
      </>
    );
  }

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link> · <Link href="/playbook">Playbook</Link>
      </p>
      <h1>Settings</h1>

      <h2>Storage</h2>
      <StorageModeToggle />

      <BackupPanel />

      <p className="optout-disclaimer">
        The red “Delete everything” button at the top of every screen wipes Errata’s data on this
        device instantly. It can’t reach your browser history, an already-downloaded backup, or the
        fact that the site was visited — export first if you want a copy you can restore.
      </p>
    </>
  );
}
