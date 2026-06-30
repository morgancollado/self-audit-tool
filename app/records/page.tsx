'use client';

// Phase 2 — Public records & legal name change (US/global). The deadname's most
// permanent sources: the indexed court order, the name-change petition's
// publication, web archives, and search caches. Gated behind the safety intro
// like the other Phase 2 flows. Region-aware (court records are sub-national) and
// carries the standing not-yet-reviewed / verify-locally banner — name-change and
// sealing content is gated on legal review (R4/R11).

import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getRecords } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { StateSelect } from '@/components/StateSelect';
import { RecordGuide } from '@/components/RecordGuide';
import { RemediationTracker } from '@/components/RemediationTracker';

export default function RecordsPage() {
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

  const jurisdiction = preferences.jurisdiction ?? { country: 'us' as const };
  const records = getRecords(jurisdiction);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link> · <Link href="/playbook">Playbook</Link> ·{' '}
        <Link href="/discover">Discover</Link> · <Link href="/remediate">Remediate</Link> ·{' '}
        <Link href="/harden">Harden</Link>
      </p>
      <h1>Public records & name change</h1>
      <p>
        These are the hardest, most permanent deadname sources — the indexed court order, the
        name-change petition’s publication, and the archives and caches that keep old copies alive.
        Some can be sealed or removed; some can only be monitored. Errata is honest about which.
      </p>

      <StorageModeToggle />

      <p className="rights-banner" role="note">
        Informational only — not legal advice, and not yet reviewed by a lawyer. Name-change and
        record-sealing rules vary by state and county and change often; verify with your court or a
        legal-aid org before acting.
      </p>

      <StateSelect note="Pick your state to see state-specific court-record guidance. Archive and cache removals work regardless of where you live." />

      <div className="record-list">
        {records.map((r) => (
          <RecordGuide key={r.slug} record={r} />
        ))}
      </div>

      <RemediationTracker />
    </>
  );
}
