'use client';

// Phase 1 — Discover (US). Guided, resumable checklist + the deadname-aware
// query generator, feeding a local findings ledger. All client-side.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { SafetyIntro } from '@/components/SafetyIntro';
import { StorageModeToggle } from '@/components/StorageModeToggle';
import { NameInputs } from '@/components/NameInputs';
import { DiscoveryChecklist } from '@/components/DiscoveryChecklist';
import { FindingsLedger } from '@/components/FindingsLedger';
import { MarginNote } from '@/components/MarginNote';
import { QueryVars } from '@/lib/discover/queries';

export default function DiscoverPage() {
  const t = useTranslations('discover');
  const tc = useTranslations('common');
  const { ready, preferences } = useStorage();
  const [vars, setVars] = useState<QueryVars>({});

  if (!ready) return <p>{tc('loading')}</p>;

  // The deadname-input surface must never be reachable without the shared-device
  // safety choice. A first-time visitor who deep-links straight here (bookmark,
  // shared link, history) meets the safety intro first — it offers session-only
  // vs. save — exactly as on the landing page. Without this, /discover let
  // someone type their deadname on a shared device with no warning at all.
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
        <Link href="/">{tc('backToErrata')}</Link>
      </p>
      <h1>{t('title')}</h1>
      <MarginNote>{t('marginLedger')}</MarginNote>
      <p>{t('intro')}</p>

      {/* Keep the shared-device mode choice reachable on this sensitive page. */}
      <StorageModeToggle />
      <NameInputs vars={vars} onChange={setVars} />
      {/* Quiet confirmation chips. The former name itself is NEVER rendered — its
          chip only confirms it is held in memory and kept off screen. */}
      {(vars.name || vars.deadname) && (
        <p className="name-chips" aria-label={t('nameChipsAria')}>
          {vars.name && <span className="name-chip">{vars.name}</span>}
          {vars.deadname && <span className="name-chip name-chip-hidden">{t('formerNameChip')}</span>}
        </p>
      )}
      <MarginNote mark="✓">{t('marginCopy')}</MarginNote>
      <DiscoveryChecklist vars={vars} />
      <FindingsLedger />

      <p className="discover-next">
        {t.rich('next', {
          link: (chunks) => <Link href="/remediate">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
