'use client';

// State-aware rights surfacing (Phase 2 / M2). Deletion rights are sub-national,
// so this picks the user's state and shows ONLY the rights that state grants —
// never implying CCPA to a non-California user. California's DROP is surfaced as
// the hero removal mechanism, gated on CA. Everything is informational and
// carries the standing not-legal-advice / not-yet-reviewed banner (R4/R11).

import { useStorage } from '@/lib/storage/StorageProvider';
import { getLaws } from '@/lib/content/data';
import { US_STATES, stateName } from '@/lib/content/us-states';
import { Law } from '@/lib/content/types';

export function StateRights() {
  const { preferences, setJurisdiction } = useStorage();
  const jurisdiction = preferences.jurisdiction ?? { country: 'us' as const };
  const region = jurisdiction.region;

  // getLaws already gates region-specific rights to an exact region match, so a
  // non-empty `regional` list means we have authored guidance for this state.
  const laws = getLaws(jurisdiction);
  const regional = laws.filter((l) => !l.appliesNationally);
  const national = laws.filter((l) => l.appliesNationally);

  return (
    <section className="rights" aria-labelledby="rights-title">
      <h2 id="rights-title">Your rights where you live</h2>

      <label className="rights-state">
        Your state
        <select
          value={region ?? ''}
          onChange={(e) =>
            void setJurisdiction({ country: 'us', region: e.target.value || undefined })
          }
        >
          <option value="">Select your state…</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <p className="rights-banner" role="note">
        Informational only — not legal advice, and not yet reviewed by a lawyer. Deletion rights vary
        by state and change often; verify your own before relying on any wording here.
      </p>

      {/* Announce the rights swap to screen-reader users when the state changes. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {region
          ? `Showing deletion rights for ${stateName(region) ?? region}.`
          : 'No state selected; showing the national baseline only.'}
      </p>

      {!region && (
        <p className="name-inputs-note">
          Pick your state to see the deletion rights you can use. You don’t need to — the broker
          opt-outs below work regardless — but in some states the law gives you much stronger tools.
        </p>
      )}

      {region && regional.length === 0 && (
        <p className="name-inputs-note">
          We don’t have verified deletion-rights guidance for {stateName(region) ?? region} yet. Your
          state may still grant rights we haven’t written up — and the broker opt-outs below work
          regardless of where you live.
        </p>
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
  return (
    <article className="law-card">
      <h3>{law.title}</h3>
      <p>{law.summary}</p>

      {law.authorizedAgent && (
        <p className="law-agent">
          You can appoint an authorized agent to make these requests for you.
        </p>
      )}

      {law.specialMechanisms?.map((m) => (
        <div key={m.key} className={`law-mechanism${hero ? ' law-mechanism-hero' : ''}`}>
          <h4>{m.title}</h4>
          <p>{m.summary}</p>
          {m.status && (
            <p className="law-mechanism-status" role="note">
              <strong>Availability:</strong> {m.status}
            </p>
          )}
          {m.url && (
            <a href={m.url} target="_blank" rel="noopener noreferrer">
              Open the official site ↗
            </a>
          )}
        </div>
      ))}

      <p className="optout-disclaimer">{law.disclaimer}</p>
      <p className="content-verified">Last verified {law.lastVerified}.</p>
    </article>
  );
}
