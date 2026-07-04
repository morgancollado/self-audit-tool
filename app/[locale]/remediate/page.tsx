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
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getBrokers } from '@/lib/content/data';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { OptOutInputs } from '@/components/OptOutInputs';
import { StateRights } from '@/components/StateRights';
import { NetworkOptOutCard } from '@/components/NetworkOptOutCard';
import { QuickSendList } from '@/components/QuickSendList';
import { RemediationTracker } from '@/components/RemediationTracker';
import { MarginNote } from '@/components/MarginNote';
import { OptOutVars } from '@/lib/remediate/optout';
import { groupBrokers } from '@/lib/remediate/networks';
import { countGroupsTracked } from '@/lib/remediate/progress';

export default function RemediatePage() {
  const t = useTranslations('remediate');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { ready, preferences, state, mode, durable } = useStorage();
  const [vars, setVars] = useState<OptOutVars>({});
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const [query, setQuery] = useState('');

  const allBrokers = useMemo(() => getBrokers('us', locale), [locale]);

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

  // Sites sharing an opt-out backbone fold into one task; filters and the
  // flagged-first ordering operate on a group's members.
  const q = query.trim().toLowerCase();
  const flagged = (g: { members: { slug: string }[] }) => g.members.some((m) => findingBySlug.has(m.slug));
  const allGroups = groupBrokers(allBrokers);
  const groups = allGroups
    .slice()
    .sort((a, b) => Number(flagged(b)) - Number(flagged(a)))
    .filter((g) => (onlyFlagged && hasFindings ? flagged(g) : true))
    .filter((g) => (q ? g.members.some((m) => m.name.toLowerCase().includes(q)) || g.name.toLowerCase().includes(q) : true));
  const trackedCount = countGroupsTracked(allGroups, state?.remediations ?? []);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">{tc('backToErrata')}</Link> · <Link href="/playbook">{tc('breadcrumb.playbook')}</Link> ·{' '}
        <Link href="/discover">{tc('breadcrumb.discover')}</Link>
      </p>
      <h1>{t('title')}</h1>
      <p>{t('intro')}</p>

      <StorageModeToggle />
      {mode === 'ephemeral' && durable && <p className="name-inputs-note">{t('ephemeralNote')}</p>}
      <StateRights />
      <OptOutInputs vars={vars} onChange={setVars} />

      <h2>{t('prepareHead')}</h2>
      <MarginNote>{t('marginDrafted')}</MarginNote>

      <p className="ledger-summary">
        {t('targetsTracked', { tracked: trackedCount, total: allGroups.length })}
      </p>

      {/* User-testing feedback: broker paywalls stopped people from even confirming
          a listing. Sending anyway is legitimate — brokers must process the request
          whether or not you saw the report. R13 nuance: the request stays keyed on
          one name, so an unconfirmed send doesn't hand over the linkage. */}
      <p className="name-inputs-note">{t('paywallNote')}</p>

      {/* The tester's own strategy — email everyone in one sweep — as a first-class
          path instead of a card-by-card slog. */}
      <QuickSendList groups={allGroups} vars={vars} findingBySlug={findingBySlug} />

      {!hasFindings && (
        <p className="name-inputs-note">
          {t.rich('noFindingsTip', {
            link: (chunks) => <Link href="/discover">{chunks}</Link>,
          })}
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
            {t('onlyFlagged')}
          </label>
        )}
        <label className="optout-filter-search">
          {t('filterByName')}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('filterPlaceholder')}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="optout-list">
        {groups.length === 0 ? (
          <p className="name-inputs-note">{t('noMatch')}</p>
        ) : (
          groups.map((g) => (
            <NetworkOptOutCard key={g.key} group={g} vars={vars} findingBySlug={findingBySlug} />
          ))
        )}
      </div>

      <p className="discover-next">
        {t.rich('nextHarden', {
          link: (chunks) => <Link href="/harden">{chunks}</Link>,
        })}
      </p>
      <p className="discover-next">
        {t.rich('nextRecords', {
          link: (chunks) => <Link href="/records">{chunks}</Link>,
        })}
      </p>

      <RemediationTracker />
    </>
  );
}
