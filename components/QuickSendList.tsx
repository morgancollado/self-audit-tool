'use client';

// Quick pass (user-testing feedback: working card by card took an hour and ended
// in fatigue, and the tester's own workaround was to email every broker whether
// or not she could confirm a listing). This lists every email-capable target with
// its prepared request — copy the address, open it in email, mark it sent — so
// the whole sweep is minutes, not a session. R13-safe by construction: every
// quick-pass request is keyed on the CURRENT name only and never carries the
// former name; a listing filed under the former name needs the broker's own card
// below, where that disclosure is an explicit choice. The send is still always
// the user's keystroke (the 95% rule).

import { useStorage } from '@/lib/storage/StorageProvider';
import { getOptOutTemplate } from '@/lib/content/data';
import { BrokerGroup, groupTrackInputs } from '@/lib/remediate/networks';
import { OptOutVars, generateOptOut } from '@/lib/remediate/optout';
import { CopyButton } from './CopyButton';

export function QuickSendList({
  groups,
  vars,
  findingBySlug,
}: {
  groups: BrokerGroup[];
  vars: OptOutVars;
  findingBySlug: Map<string, string>;
}) {
  const { state, addRemediations } = useStorage();
  const remediations = state?.remediations ?? [];
  const isTracked = (g: BrokerGroup) =>
    g.members.every((m) => remediations.some((r) => r.pillar === 'optout' && r.refId === m.slug));

  const rows = groups.map((group) => {
    const rep = group.representative;
    const template = rep.optOut.templateKey ? getOptOutTemplate(rep.optOut.templateKey) : undefined;
    const gen = template
      ? generateOptOut(rep, template, vars, { listedUnder: 'current', includeOtherName: false })
      : undefined;
    // mailtoUrl exists only when the broker accepts email and has an address.
    return { group, gen: gen?.mailtoUrl ? gen : undefined, email: rep.optOut.email ?? undefined };
  });
  const emailable = rows.filter((r) => r.gen && r.email);
  const formOnly = rows.filter((r) => !r.gen || !r.email);
  if (emailable.length === 0) return null;

  const missingName = emailable.some((r) => r.gen!.missingPrimaryName);

  return (
    <details className="quicksend">
      <summary>Quick pass — email every target in one sitting</summary>
      <p className="name-inputs-note">
        The same removal request the cards below prepare, one per target, keyed on your current
        name only — your former name is never included here. Found a listing under your former
        name? Use that broker’s card below, where including it is an explicit choice.
      </p>
      {missingName ? (
        <p className="optout-warn" role="note">
          Add your current name in “Your details” above and the requests fill in here.
        </p>
      ) : (
        <ul className="quicksend-list">
          {emailable.map(({ group, gen, email }) => (
            <li key={group.key}>
              <strong>{group.name}</strong> — {email}
              <div className="optout-actions">
                <CopyButton text={email!} label="Copy address" />
                <CopyButton text={gen!.subject} label="Copy subject" />
                <CopyButton text={gen!.body} label="Copy message" />
                <a className="optout-send" href={gen!.mailtoUrl}>
                  Open in email ↗
                </a>
                {isTracked(group) ? (
                  <span className="optout-tracked">Tracked ✓</span>
                ) : (
                  <button type="button" onClick={() => addRemediations(groupTrackInputs(group, findingBySlug))}>
                    I’ve sent this — track it
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOnly.length > 0 && (
        <p className="name-inputs-note">
          {formOnly.map((r) => r.group.name).join(' and ')}{' '}
          {formOnly.length === 1 ? 'takes' : 'take'} a web form only — use{' '}
          {formOnly.length === 1 ? 'its card' : 'their cards'} below.
        </p>
      )}
    </details>
  );
}
