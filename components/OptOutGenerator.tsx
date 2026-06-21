'use client';

// Per-broker opt-out generator (Phase 2 / M2). Prepares the request in memory and
// hands the user the artifact; the send is always their keystroke (the 95% rule).
// Surfaces the opt-out paradox (R13) in BOTH directions: the request is keyed on
// the name the listing is actually filed under, and the user's *other* name is
// opt-in and OFF by default everywhere — so opting out never silently broadcasts
// either name to a custodian that didn't already hold it. "Leave it" stays a real,
// first-class outcome.

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getOptOutTemplate } from '@/lib/content/data';
import { Broker } from '@/lib/content/types';
import { ListedUnder, OptOutVars, generateOptOut } from '@/lib/remediate/optout';
import { CopyButton } from './CopyButton';

export function OptOutGenerator({
  broker,
  vars,
  findingId,
}: {
  broker: Broker;
  vars: OptOutVars;
  findingId?: string;
}) {
  const { addRemediation } = useStorage();
  const exposesLinkage = broker.optOut.optOutExposesLinkage ?? false;
  const [listedUnder, setListedUnder] = useState<ListedUnder>('current');
  // The other name is the linkage disclosure in both directions — default OFF
  // ALWAYS, never keyed off exposesLinkage (a broker that simply forgot the flag
  // must not become the one place a deadname leaks by default).
  const [includeOtherName, setIncludeOtherName] = useState(false);
  const [tracked, setTracked] = useState(false);

  const template = broker.optOut.templateKey ? getOptOutTemplate(broker.optOut.templateKey) : undefined;
  const gen = template ? generateOptOut(broker, template, vars, { listedUnder, includeOtherName }) : undefined;

  // Switching which name the listing is under flips the meaning of "the other
  // name", so reset the opt-in to its safe default whenever it changes.
  const changeListedUnder = (next: ListedUnder) => {
    setListedUnder(next);
    setIncludeOtherName(false);
  };

  const otherLabel = listedUnder === 'current' ? 'former name' : 'current name';

  const track = async (action: string) => {
    await addRemediation({ findingId, pillar: 'optout', refId: broker.slug, action, state: 'sent' });
    setTracked(true);
  };

  return (
    <section className="optout" aria-labelledby={`optout-${broker.slug}`}>
      <div className="optout-head">
        <h3 id={`optout-${broker.slug}`}>{broker.name}</h3>
        <span className={`badge priority-${broker.exposesDeadnameRisk}`}>{broker.exposesDeadnameRisk} risk</span>
      </div>

      {/* The opt-out paradox, stated plainly with a real "leave it" path. */}
      {exposesLinkage && (
        <div className="optout-paradox" role="note">
          <strong>Opting out here can reveal the link itself.</strong>{' '}
          {broker.optOut.leaveItGuidance ??
            'Submitting this request may tell the broker your current and former names are the same person.'}{' '}
          Leaving a low-reach listing alone and monitoring it is a legitimate choice — not a failure.
        </div>
      )}

      {broker.optOut.requiresId && (
        <p className="optout-warn" role="note">
          This broker asks for ID. Send only what is strictly required — redact everything else, and
          never include more than they ask for.
        </p>
      )}

      {gen ? (
        <>
          <fieldset className="optout-listedunder">
            <legend>Which name is this listing filed under?</legend>
            <label>
              <input
                type="radio"
                name={`listedunder-${broker.slug}`}
                checked={listedUnder === 'current'}
                onChange={() => changeListedUnder('current')}
              />
              My current name
            </label>
            <label>
              <input
                type="radio"
                name={`listedunder-${broker.slug}`}
                checked={listedUnder === 'former'}
                onChange={() => changeListedUnder('former')}
              />
              My former name
            </label>
          </fieldset>

          {listedUnder === 'former' && (
            <p className="optout-warn" role="note">
              This request will contain your former name, because the listing is filed under it — that
              is necessary to ask for this specific record’s removal. Your current name stays out unless
              you add it below.
            </p>
          )}

          <label className="optout-aliases">
            <input
              type="checkbox"
              checked={includeOtherName}
              onChange={(e) => setIncludeOtherName(e.target.checked)}
            />
            Also include my {otherLabel} in this request
            <span className="optout-aliases-warn"> — off by default; adding it discloses the link</span>
          </label>

          {/* Concise, screen-reader-announced status for the toggle above. */}
          <p className="visually-hidden" role="status" aria-live="polite">
            {includeOtherName
              ? `Your ${otherLabel} will be included in the ${broker.name} request.`
              : `Your ${otherLabel} is left out of the ${broker.name} request.`}
          </p>

          {gen.missingPrimaryName && (
            <p className="optout-warn" role="note">
              Add your {listedUnder === 'former' ? 'former name' : 'current name'} in “Your details”
              above so Errata can fill this request in.
            </p>
          )}

          <p className="optout-format-note">
            Prepared on this device. Nothing is sent until you send it. Subject and message:
          </p>

          <label className="optout-field">
            Subject
            <input type="text" readOnly value={gen.subject} aria-label={`Subject for ${broker.name}`} />
          </label>
          <pre className="optout-body" aria-label={`Request body for ${broker.name}`}>{gen.body}</pre>

          <div className="optout-actions">
            <CopyButton text={gen.body} label="Copy message" />
            <CopyButton text={gen.subject} label="Copy subject" />
            {gen.mailtoUrl && (
              <a className="optout-send" href={gen.mailtoUrl}>
                Open in email ↗
              </a>
            )}
            {broker.optOut.webFormUrl && (
              <a className="optout-send" href={broker.optOut.webFormUrl} target="_blank" rel="noopener noreferrer">
                Open opt-out form ↗
              </a>
            )}
          </div>

          {broker.optOut.steps.length > 0 && (
            <ol className="optout-steps">
              {broker.optOut.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}

          <p className="optout-disclaimer">{gen.disclaimer}</p>
          <p className="content-verified">Broker details last verified {broker.lastVerified}.</p>

          <div className="optout-track">
            {tracked ? (
              <span className="optout-tracked">Added to your tracker ✓</span>
            ) : (
              <button type="button" onClick={() => track(`Opt-out request to ${broker.name}`)}>
                I’ve sent this — track it
              </button>
            )}
          </div>
        </>
      ) : (
        // No template wired: still no dead-end — the broker's own steps are the action.
        <ol className="optout-steps">
          {broker.optOut.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          {broker.optOut.webFormUrl && (
            <li>
              <a href={broker.optOut.webFormUrl} target="_blank" rel="noopener noreferrer">
                Open opt-out form ↗
              </a>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
