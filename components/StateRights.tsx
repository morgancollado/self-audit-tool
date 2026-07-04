'use client';

// State-aware rights surfacing (Phase 2 / M2). Deletion rights are sub-national,
// so this picks the user's state and shows ONLY the rights that state grants —
// never implying CCPA to a non-California user. California's DROP is surfaced as
// the hero removal mechanism, gated on CA. Everything is informational and
// carries the standing not-legal-advice / not-yet-reviewed banner (R4/R11).

import { useLocale, useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getLaws } from '@/lib/content/data';
import { US_STATES, stateName } from '@/lib/content/us-states';
import { Law } from '@/lib/content/types';
import { UntranslatedNote } from './UntranslatedNote';

export function StateRights() {
  const t = useTranslations('rights');
  const locale = useLocale();
  const { preferences, setJurisdiction } = useStorage();
  const jurisdiction = preferences.jurisdiction ?? { country: 'us' as const };
  const region = jurisdiction.region;

  // getLaws already gates region-specific rights to an exact region match, so a
  // non-empty `regional` list means we have authored guidance for this state.
  const laws = getLaws(jurisdiction, locale);
  const regional = laws.filter((l) => !l.appliesNationally);
  const national = laws.filter((l) => l.appliesNationally);

  return (
    <section className="rights" aria-labelledby="rights-title">
      <h2 id="rights-title">{t('title')}</h2>

      <label className="rights-state">
        {t('yourState')}
        <select
          value={region ?? ''}
          onChange={(e) =>
            void setJurisdiction({ country: 'us', region: e.target.value || undefined })
          }
        >
          <option value="">{t('selectState')}</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <p className="rights-banner" role="note">
        {t('banner')}
      </p>

      {/* Announce the rights swap to screen-reader users when the state changes. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {region ? t('showingFor', { state: stateName(region) ?? region }) : t('noneSelected')}
      </p>

      {!region && <p className="name-inputs-note">{t('pickPrompt')}</p>}

      {region && regional.length === 0 && (
        <p className="name-inputs-note">{t('noGuidance', { state: stateName(region) ?? region })}</p>
      )}

      {regional.map((law) => (
        <LawCard key={law.key} law={law} hero />
      ))}

      {national.map((law) => (
        <LawCard key={law.key} law={law} hero={false} />
      ))}
    </section>
  );
}

function LawCard({ law, hero }: { law: Law; hero: boolean }) {
  const t = useTranslations('rights');
  const tc = useTranslations('common');
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
      <p className="content-verified">{tc('lastVerified', { date: law.lastVerified })}</p>
    </article>
  );
}
