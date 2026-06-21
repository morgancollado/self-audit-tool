'use client';

// Phase 2 — Platform hardening & deadname removal (US/global). Guided,
// click-by-click flows for the major platforms, with deadname-removal first.
// Gated behind the shared-device safety intro like /discover and /remediate, and
// shares the remediation tracker so platform actions land in the same record.

import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getPlatforms } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { PlatformGuide } from '@/components/PlatformGuide';
import { RemediationTracker } from '@/components/RemediationTracker';

export default function HardenPage() {
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

  const platforms = getPlatforms();

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link> · <Link href="/discover">Discover</Link> ·{' '}
        <Link href="/remediate">Remediate</Link>
      </p>
      <h1>Harden platforms</h1>
      <p>
        Update your accounts so they carry your current name, and lock down what others can see. Each
        platform leads with removing your former name, then hardening. Go at your own pace — the
        easiest wins are first.
      </p>

      <StorageModeToggle />

      <div className="platform-list">
        {platforms.map((p) => (
          <PlatformGuide key={p.slug} platform={p} />
        ))}
      </div>

      <p className="discover-next">
        The most permanent sources — court orders, name changes, archives —{' '}
        <Link href="/records">are handled here →</Link>
      </p>

      <RemediationTracker />
    </>
  );
}
