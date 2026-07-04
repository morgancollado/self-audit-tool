'use client';

// Jurisdiction-aware rights surfacing (Phase 2 / M2+M3). Deletion rights are
// sub-national in the US, so the picker selects country + state and this shows
// ONLY the rights that jurisdiction grants — never implying CCPA to a
// non-California user, and never US law to a Colombian user (or vice versa).
// California's DROP is surfaced as the US hero mechanism, gated on CA; Colombia
// shows the national habeas-data framework (Ley 1581). Everything is
// informational and carries the standing not-legal-advice banner (R4/R11).

import { useLocale, useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getLaws } from '@/lib/content/data';
import { stateName } from '@/lib/content/us-states';
import { Law } from '@/lib/content/types';
import { JurisdictionSelect } from './JurisdictionSelect';
import { UntranslatedNote } from './UntranslatedNote';
import { formatContentDate } from '@/lib/content/format-date';

export function StateRights() {
  const t = useTranslations('rights');
  const locale = useLocale();
  const { preferences } = useStorage();
  const jurisdiction = preferences.jurisdiction ?? { country: 'us' as const };
  const isUs = jurisdiction.country === 'us';
  const region = isUs ? jurisdiction.region : undefined;

  // getLaws already gates region-specific rights to an exact region match, so a
  // non-empty `regional` list means we have authored guidance for this state.
  const laws = getLaws(jurisdiction, locale);
  const regional = laws.filter((l) => !l.appliesNationally);
  const national = laws.filter((l) => l.appliesNationally);

  return (
    <section className="rights" aria-labelledby="rights-title">
      <h2 id="rights-title">{t('title')}</h2>

      <JurisdictionSelect />

      <p className="rights-banner" role="note">
        {t('banner')}
      </p>

      {/* Announce the rights swap to screen-reader users when the pick changes. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {!isUs
          ? t('showingCo')
          : region
            ? t('showingFor', { state: stateName(region) ?? region })
            : t('noneSelected')}
      </p>

      {isUs && !region && <p className="name-inputs-note">{t('pickPrompt')}</p>}

      {isUs && region && regional.length === 0 && (
        <p className="name-inputs-note">{t('noGuidance', { state: stateName(region) ?? region })}</p>
      )}

      {regional.map((law) => (
        <LawCard key={law.key} law={law} hero />
      ))}

      {national.map((law) => (
        <LawCard key={law.key} law={law} hero={jurisdiction.country === 'co'} />
      ))}
    </section>
  );
}

function LawCard({ law, hero }: { law: Law; hero: boolean }) {
  const t = useTranslations('rights');
  const tc = useTranslations('common');
  const locale = useLocale();
  return (
    <article className="law-card">
      <h3>{law.title}</h3>
      <UntranslatedNote item={law} />
      <p>{law.summary}</p>

      {law.authorizedAgent && <p className="law-agent">{t('agent')}</p>}

      {law.specialMechanisms?.map((m) => (
        <div key={m.key} className={`law-mechanism${hero ? ' law-mechanism-hero' : ''}`}>
          <h4>{m.title}</h4>
          <p>{m.summary}</p>
          {m.status && (
            <p className="law-mechanism-status" role="note">
              <strong>{t('availability')}</strong> {m.status}
            </p>
          )}
          {m.url && (
            <a href={m.url} target="_blank" rel="noopener noreferrer">
              {t('openOfficial')}
            </a>
          )}
        </div>
      ))}

      <p className="optout-disclaimer">{law.disclaimer}</p>
      <p className="content-verified">
        {tc('lastVerified', { date: formatContentDate(law.lastVerified, locale) })}
      </p>
    </article>
  );
}
