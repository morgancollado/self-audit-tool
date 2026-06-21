'use client';

// Phase 2 — Remediate (US). Per-broker opt-out generation: requests prepared in
// memory, the user presses send (the 95% rule). Gated behind the shared-device
// safety intro exactly like /discover — the former-name input surface must never
// be reachable without the safety choice.

import { useState } from 'react';
import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getBrokers } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { OptOutInputs } from '@/components/OptOutInputs';
import { OptOutGenerator } from '@/components/OptOutGenerator';
import { RemediationTracker } from '@/components/RemediationTracker';
import { OptOutVars } from '@/lib/remediate/optout';

export default function RemediatePage() {
  const { ready, preferences } = useStorage();
  const [vars, setVars] = useState<OptOutVars>({});

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

  const brokers = getBrokers('us');

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link> · <Link href="/discover">Discover</Link>
      </p>
      <h1>Remediate</h1>
      <p>
        For each broker, Errata prepares a removal request from your details — on this device. Read
        it, decide whether to include your former name, then send it yourself. Nothing is transmitted
        for you.
      </p>

      <StorageModeToggle />
      <OptOutInputs vars={vars} onChange={setVars} />

      <p className="optout-legal" role="note">
        This is general information, not legal advice. Deletion rights vary by state — verify your own
        before relying on any wording here.
      </p>

      <div className="optout-list">
        {brokers.map((b) => (
          <OptOutGenerator key={b.slug} broker={b} vars={vars} />
        ))}
      </div>

      <RemediationTracker />
    </>
  );
}
