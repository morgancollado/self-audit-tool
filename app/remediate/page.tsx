'use client';

// Phase 2 — Remediate (US). Per-broker opt-out generation: requests prepared in
// memory, the user presses send (the 95% rule). Gated behind the shared-device
// safety intro exactly like /discover — the former-name input surface must never
// be reachable without the safety choice.
//
// Findings-driven: when the user has run Discover, this leads with the brokers
// they were actually found on (and ties each prepared request back to its finding
// for the tracker), rather than dumping the whole dataset on them. With no
// findings it still shows the full set — no dead end — but with a nudge to Discover
// first, and a filter so the list stays usable as the dataset grows.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getBrokers } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { OptOutInputs } from '@/components/OptOutInputs';
import { StateRights } from '@/components/StateRights';
import { NetworkOptOutCard } from '@/components/NetworkOptOutCard';
import { RemediationTracker } from '@/components/RemediationTracker';
import { OptOutVars } from '@/lib/remediate/optout';
import { groupBrokers } from '@/lib/remediate/networks';

export default function RemediatePage() {
  const { ready, preferences, state } = useStorage();
  const [vars, setVars] = useState<OptOutVars>({});
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const [query, setQuery] = useState('');

  const allBrokers = useMemo(() => getBrokers('us'), []);

  // Map broker slug -> the discovery finding that flagged it, so we can lead with
  // (and tie remediations back to) where the user was actually found.
  const findingBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of state?.findings ?? []) {
      if (f.source === 'broker' && f.refId && !m.has(f.refId)) m.set(f.refId, f.id);
    }
    return m;
  }, [state]);
  const hasFindings = findingBySlug.size > 0;

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

  // Sites sharing an opt-out backbone fold into one task; filters and the
  // flagged-first ordering operate on a group's members.
  const q = query.trim().toLowerCase();
  const flagged = (g: { members: { slug: string }[] }) => g.members.some((m) => findingBySlug.has(m.slug));
  const groups = groupBrokers(allBrokers)
    .sort((a, b) => Number(flagged(b)) - Number(flagged(a)))
    .filter((g) => (onlyFlagged && hasFindings ? flagged(g) : true))
    .filter((g) => (q ? g.members.some((m) => m.name.toLowerCase().includes(q)) || g.name.toLowerCase().includes(q) : true));

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">← Errata</Link> · <Link href="/playbook">Playbook</Link> ·{' '}
        <Link href="/discover">Discover</Link>
      </p>
      <h1>Remediate</h1>
      <p>
        For each broker, Errata prepares a removal request from your details. Read it, decide which
        name the listing is under, then send it yourself.
      </p>

      <StorageModeToggle />
      <StateRights />
      <OptOutInputs vars={vars} onChange={setVars} />

      <h2>Prepare your removal requests</h2>

      {/* User-testing feedback: broker paywalls stopped people from even confirming
          a listing. Sending anyway is legitimate — brokers must process the request
          whether or not you saw the report. R13 nuance: the request stays keyed on
          one name, so an unconfirmed send doesn't hand over the linkage. */}
      <p className="name-inputs-note">
        Couldn’t confirm a listing because the site wanted payment or a sign-up? Send the request
        anyway — brokers have to process it whether or not you saw the report. Each request carries
        only the one name you choose below, so you’re not handing them anything new.
      </p>

      {!hasFindings && (
        <p className="name-inputs-note">
          These are the brokers Errata covers. Tip: <Link href="/discover">run Discover</Link> first to
          focus on the ones you’re actually listed on.
        </p>
      )}

      <div className="optout-filter">
        {hasFindings && (
          <label>
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
            />
            Show only brokers from my Discover findings
          </label>
        )}
        <label className="optout-filter-search">
          Filter by name
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Spokeo"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="optout-list">
        {groups.length === 0 ? (
          <p className="name-inputs-note">No brokers match that filter.</p>
        ) : (
          groups.map((g) => (
            <NetworkOptOutCard key={g.key} group={g} vars={vars} findingBySlug={findingBySlug} />
          ))
        )}
      </div>

      <p className="discover-next">
        Listed on platforms too? <Link href="/harden">Harden your accounts & remove your former name →</Link>
      </p>
      <p className="discover-next">
        Deadname in a court order, name-change petition, or web archive?{' '}
        <Link href="/records">Tackle public records →</Link>
      </p>

      <RemediationTracker />
    </>
  );
}
