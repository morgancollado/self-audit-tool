'use client';

// Phase 1 — Discover (US). Guided, resumable checklist + the deadname-aware
// query generator, feeding a local findings ledger. All client-side.

import { useState } from 'react';
import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { NameInputs } from '@/components/NameInputs';
import { DiscoveryChecklist } from '@/components/DiscoveryChecklist';
import { FindingsLedger } from '@/components/FindingsLedger';
import { QueryVars } from '@/lib/discover/queries';

export default function DiscoverPage() {
  const { ready } = useStorage();
  const [vars, setVars] = useState<QueryVars>({});

  if (!ready) return <p>Loading…</p>;

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link>
      </p>
      <h1>Discover</h1>
      <p>
        Find what’s out there the way someone looking for you would. Go at your own pace — you can
        stop and come back. Nothing here is sent or saved unless you add it to your ledger, and even
        that stays on this device.
      </p>

      <NameInputs vars={vars} onChange={setVars} />
      <DiscoveryChecklist vars={vars} />
      <FindingsLedger />
    </>
  );
}
