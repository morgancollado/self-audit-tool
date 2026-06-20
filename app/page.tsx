'use client';

// M0 landing. Shows the first-run safety intro, then a calm "you're set up"
// state with the storage-mode control. The Discover/Remediate flows land in
// M1/M2 (scope/docs/07-roadmap.md).

import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';

export default function HomePage() {
  const { ready, preferences } = useStorage();

  if (!ready) {
    return <p>Loading…</p>;
  }

  return (
    <>
      <h1>Errata</h1>
      <p>Find what’s published about you, and correct the record — without anyone holding your data.</p>

      <SafetyIntro />

      {preferences.safetyIntroAcknowledged && (
        <>
          <p>You’re set up. The Discover and Remediate steps arrive next.</p>
          <StorageModeToggle />
        </>
      )}
    </>
  );
}
