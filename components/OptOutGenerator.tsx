'use client';

// Per-broker opt-out generator (Phase 2 / M2). Prepares the request in memory and
// hands the user the artifact; the send is always their keystroke (the 95% rule).
// Surfaces the opt-out paradox (R13): including the former name is opt-in, off by
// default for brokers where the opt-out itself discloses the linkage, and "leave
// it" is offered as a real, first-class outcome — never a failure state.

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getOptOutTemplate } from '@/lib/content/data';
import { Broker } from '@/lib/content/types';
import { OptOutVars, generateOptOut } from '@/lib/remediate/optout';
import { CopyButton } from './CopyButton';

export function OptOutGenerator({ broker, vars }: { broker: Broker; vars: OptOutVars }) {
  const { addRemediation } = useStorage();
  const exposesLinkage = broker.optOut.optOutExposesLinkage ?? false;
  // Default the former-name inclusion OFF whenever opting out would expose the
  // current<->former linkage to this custodian.
  const [includeAliases, setIncludeAliases] = useState(!exposesLinkage);
  const [tracked, setTracked] = useState(false);

  const template = broker.optOut.templateKey ? getOptOutTemplate(broker.optOut.templateKey) : undefined;
  const gen = template ? generateOptOut(broker, template, vars, includeAliases) : undefined;

  const track = async (action: string) => {
    await addRemediation({ findingId: undefined, pillar: 'optout', refId: broker.slug, action, state: 'sent' });
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
          <label className="optout-aliases">
            <input
              type="checkbox"
              checked={includeAliases}
              onChange={(e) => setIncludeAliases(e.target.checked)}
            />
            Include my former name in this request
            {exposesLinkage && <span className="optout-aliases-warn"> — off by default; this discloses the link</span>}
          </label>

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
