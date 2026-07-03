'use client';

// Per-broker opt-out generator (Phase 2 / M2). Prepares the request in memory and
// hands the user the artifact; the send is always their keystroke (the 95% rule).
// Surfaces the opt-out paradox (R13) in BOTH directions: the request is keyed on
// the name the listing is actually filed under, and the user's *other* name is
// opt-in and OFF by default everywhere — so opting out never silently broadcasts
// either name to a custodian that didn't already hold it. "Leave it" stays a real,
// first-class outcome. When listings exist under both names, the safe path is two
// independent requests — never one request carrying both names.

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getOptOutTemplate } from '@/lib/content/data';
import { Broker } from '@/lib/content/types';
import { NewRemediationInput } from '@/lib/model/factory';
import {
  GeneratedOptOut,
  ListedUnder,
  OptOutVars,
  generateOptOut,
  pairSharesContact,
} from '@/lib/remediate/optout';
import { CopyButton } from './CopyButton';

type ListedUnderChoice = ListedUnder | 'both';

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Wash every user-specific insertion in the letter body so the user can verify
 * their own details at a glance before copying. Purely presentational — the text
 * content (and so the clipboard/`innerText`) is unchanged.
 */
function washInsertions(body: string, values: string[]): React.ReactNode[] {
  const uniq = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );
  if (uniq.length === 0) return [body];
  const re = new RegExp(`(${uniq.map(escapeRe).join('|')})`, 'g');
  return body.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="fill">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** One prepared request: subject, body, and the ways to send it. */
function Artifact({
  broker,
  gen,
  label,
  highlight = [],
}: {
  broker: Broker;
  gen: GeneratedOptOut;
  label?: string;
  /** User-specific values to wash in the letter body (names, location, email). */
  highlight?: string[];
}) {
  const forLabel = label ? `${label} for ${broker.name}` : `for ${broker.name}`;
  return (
    <>
      <p className="optout-format-note">{label ? `${label} — subject and message:` : 'Subject and message:'}</p>

      <label className="optout-field">
        Subject
        <input type="text" readOnly value={gen.subject} aria-label={`Subject ${forLabel}`} />
      </label>
      <pre className="optout-body" aria-label={`Request body ${forLabel}`}>
        {washInsertions(gen.body, highlight)}
      </pre>

      {/* The direct email route (user-testing feedback: hunting for it on each
          site was the time sink). Shown as a visible, copyable address because
          mailto: links go nowhere for webmail users. */}
      {gen.mailtoUrl && broker.optOut.email && (
        <p className="optout-email-route">
          Email it to <strong>{broker.optOut.email}</strong>{' '}
          <CopyButton text={broker.optOut.email} label="Copy address" variant="quiet" />
        </p>
      )}

      {/* One emphasized action — copy the whole letter; everything else is quiet. */}
      <div className="optout-actions">
        <CopyButton text={gen.body} label="Copy the letter" variant="primary" />
        <CopyButton text={gen.subject} label="Copy subject only" variant="quiet" />
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

      {gen.mailtoUrl && broker.optOut.webFormUrl && (
        <p className="optout-format-note">
          If the form errors or won’t show your listing, email them directly instead — the request
          works either way.
        </p>
      )}
    </>
  );
}

export function OptOutGenerator({
  broker,
  vars,
  findingId,
  heading,
  intro,
  trackInputs,
}: {
  broker: Broker;
  vars: OptOutVars;
  findingId?: string;
  /** Display title override (e.g. a network name); the request itself is still this broker's. */
  heading?: string;
  /** Extra content under the title (e.g. which sibling sites this request covers). */
  intro?: React.ReactNode;
  /**
   * The tracker rows one send of this card creates (network cards pass a row per
   * member site via groupTrackInputs); defaults to just this broker.
   */
  trackInputs?: NewRemediationInput[];
}) {
  const { state, addRemediations } = useStorage();
  const exposesLinkage = broker.optOut.optOutExposesLinkage ?? false;
  const [listedUnder, setListedUnder] = useState<ListedUnderChoice>('current');
  // The other name is the linkage disclosure in both directions — default OFF
  // ALWAYS, never keyed off exposesLinkage (a broker that simply forgot the flag
  // must not become the one place a deadname leaks by default).
  const [includeOtherName, setIncludeOtherName] = useState(false);
  const inputs: NewRemediationInput[] = trackInputs ?? [
    {
      findingId,
      pillar: 'optout',
      refId: broker.slug,
      action: `Opt-out request to ${broker.name}`,
      state: 'sent',
    },
  ];
  // Derive "tracked" from the shared tracker (keyed by pillar+refId), not local
  // state — so removing the row in the tracker re-renders the button here. A
  // network card is tracked only when every covered site has its row.
  const remediations = state?.remediations ?? [];
  const tracked = inputs.every((t) =>
    remediations.some((r) => r.pillar === 'optout' && r.refId === t.refId),
  );

  const template = broker.optOut.templateKey ? getOptOutTemplate(broker.optOut.templateKey) : undefined;
  const both = listedUnder === 'both';
  // "Both names" is two INDEPENDENT artifacts — one keyed per name, the other
  // name omitted from each — never a single request linking the two (R13).
  const gen = template && !both
    ? generateOptOut(broker, template, vars, { listedUnder, includeOtherName })
    : undefined;
  const genPair = template && both
    ? {
        current: generateOptOut(broker, template, vars, { listedUnder: 'current', includeOtherName: false }),
        former: generateOptOut(broker, template, vars, { listedUnder: 'former', includeOtherName: false }),
      }
    : undefined;

  // Switching which name the listing is under flips the meaning of "the other
  // name", so reset the opt-in to its safe default whenever it changes.
  const changeListedUnder = (next: ListedUnderChoice) => {
    setListedUnder(next);
    setIncludeOtherName(false);
  };

  const otherLabel = listedUnder === 'current' ? 'former name' : 'current name';

  // The user-specific values that get washed in the letter body so they can be
  // verified at a glance (Screen C). Only values actually written into a given
  // request will match; the rest are inert.
  const highlight = [vars.name, vars.aliases, vars.location, vars.email].filter(
    (v): v is string => !!v && v.trim() !== '',
  );

  // One row per covered site, written in a single batch: presentation groups
  // them, the tracker's data stays keyed by broker slug
  // (scope/docs/04-data-model.md). Row labels never carry the user's names.
  const track = () => addRemediations(inputs);

  return (
    <section className="optout" aria-labelledby={`optout-${broker.slug}`}>
      <div className="optout-head">
        <h3 id={`optout-${broker.slug}`}>{heading ?? broker.name}</h3>
        <span className={`stamp priority-${broker.exposesDeadnameRisk}`}>{broker.exposesDeadnameRisk} risk</span>
      </div>
      {intro}

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

      {gen || genPair ? (
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
            <label>
              <input
                type="radio"
                name={`listedunder-${broker.slug}`}
                checked={both}
                onChange={() => changeListedUnder('both')}
              />
              Both names — I found separate listings
            </label>
          </fieldset>

          {listedUnder === 'former' && (
            <p className="optout-warn" role="note">
              This request will contain your former name, because the listing is filed under it — that
              is necessary to ask for this specific record’s removal. Your current name stays out unless
              you add it below.
            </p>
          )}

          {/* In both-names mode the other-name opt-in disappears entirely: adding
              either name to the other request would defeat the point of keeping
              the two requests unlinkable. */}
          {!both && (
            <>
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
            </>
          )}

          {gen && gen.missingPrimaryName && (
            <p className="optout-warn" role="note">
              Add your {listedUnder === 'former' ? 'former name' : 'current name'} in “Your details”
              above so Errata can fill this request in.
            </p>
          )}

          {gen && <Artifact broker={broker} gen={gen} highlight={highlight} />}

          {genPair && (
            <>
              <p className="optout-warn" role="note">
                You’ll send two separate requests — one per listing, each carrying only that
                listing’s name. Send them as two separate messages, ideally not back-to-back, so
                the broker can’t pair them up.
              </p>
              {pairSharesContact(vars) ? (
                <p className="optout-warn" role="note">
                  Both requests would carry the same reply-to email — that alone links your names
                  for this broker. Use a different address for the former-name request, or send one
                  of the two through the web form instead.
                </p>
              ) : (
                // Even with no email written into the requests, emailing both from
                // one mail account links the names by the sender address alone.
                genPair.current.mailtoUrl && (
                  <p className="optout-warn" role="note">
                    If you email both, the sender address links your names all by itself. Send them
                    from two different addresses, or send one of the two through the web form
                    instead.
                  </p>
                )
              )}
              {(genPair.current.missingPrimaryName || genPair.former.missingPrimaryName) && (
                <p className="optout-warn" role="note">
                  Add your{' '}
                  {genPair.current.missingPrimaryName && genPair.former.missingPrimaryName
                    ? 'current and former names'
                    : genPair.current.missingPrimaryName
                      ? 'current name'
                      : 'former name'}{' '}
                  in “Your details” above so Errata can fill both requests in.
                </p>
              )}
              <Artifact broker={broker} gen={genPair.current} label="Request 1 (current-name listing)" highlight={highlight} />
              <Artifact broker={broker} gen={genPair.former} label="Request 2 (former-name listing)" highlight={highlight} />
            </>
          )}

          {broker.optOut.steps.length > 0 && (
            <ol className="optout-steps">
              {broker.optOut.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}

          <p className="optout-disclaimer">{(gen ?? genPair!.current).disclaimer}</p>
          <p className="content-verified">Broker details last verified {broker.lastVerified}.</p>

          {/* Hairline-topped row: the send control on the left, the entry's
              current stamp on the right (Screen C). */}
          <div className="optout-track">
            {tracked ? (
              <span className="optout-tracked">Added to your tracker ✓</span>
            ) : (
              <button type="button" onClick={track}>
                I’ve sent this — track it
              </button>
            )}
            <span className={`stamp ${tracked ? 'state-sent' : 'state-todo'}`}>
              {tracked ? 'sent' : 'to do'}
            </span>
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
