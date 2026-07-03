'use client';

// Phase 1 — Discover (US). Guided, resumable checklist + the deadname-aware
// query generator, feeding a local findings ledger. All client-side.

import { useState } from 'react';
import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { NameInputs } from '@/components/NameInputs';
import { DiscoveryChecklist } from '@/components/DiscoveryChecklist';
import { FindingsLedger } from '@/components/FindingsLedger';
import { QueryVars } from '@/lib/discover/queries';

export default function DiscoverPage() {
  const { ready, preferences } = useStorage();
  const [vars, setVars] = useState<QueryVars>({});

  if (!ready) return <p>Loading…</p>;

  // The deadname-input surface must never be reachable without the shared-device
  // safety choice. A first-time visitor who deep-links straight here (bookmark,
  // shared link, history) meets the safety intro first — it offers session-only
  // vs. save — exactly as on the landing page. Without this, /discover let
  // someone type their deadname on a shared device with no warning at all.
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
        <Link href="/">← Errata</Link>
      </p>
      <h1>Discover</h1>
      <p>
        Find what’s out there the way someone looking for you would. Go at your own pace — you can
        stop and come back.
      </p>

      {/* Keep the shared-device mode choice reachable on this sensitive page. */}
      <StorageModeToggle />
      <NameInputs vars={vars} onChange={setVars} />
      {/* Quiet confirmation chips. The former name itself is NEVER rendered — its
          chip only confirms it is held in memory and kept off screen. */}
      {(vars.name || vars.deadname) && (
        <p className="name-chips" aria-label="Names in use">
          {vars.name && <span className="name-chip">{vars.name}</span>}
          {vars.deadname && <span className="name-chip name-chip-hidden">former name · hidden</span>}
        </p>
      )}
      <DiscoveryChecklist vars={vars} />
      <FindingsLedger />

      <p className="discover-next">
        When you’re ready to act on what you found,{' '}
        <Link href="/remediate">prepare removal requests →</Link>
      </p>
    </>
  );
}
