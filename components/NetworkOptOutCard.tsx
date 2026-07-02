'use client';

// One opt-out task per distinct backbone (user-testing feedback: several broker
// sites front the same engine, and walking them one by one is exhausting). A
// network group renders a single card — one prepared request, sent once — while
// listing every sibling site it covers. Tracking stays per-broker underneath,
// and is honest about coverage: a 'shared-backbone' network's siblings become
// re-check to-dos, never "sent" (see groupTrackInputs).

import { OptOutVars } from '@/lib/remediate/optout';
import { Broker } from '@/lib/content/types';
import { BrokerGroup, groupTrackInputs } from '@/lib/remediate/networks';
import { OptOutGenerator } from './OptOutGenerator';

export function NetworkOptOutCard({
  group,
  vars,
  findingBySlug,
}: {
  group: BrokerGroup;
  vars: OptOutVars;
  findingBySlug: Map<string, string>;
}) {
  const rep = group.representative;

  if (!group.isNetwork) {
    return <OptOutGenerator broker={rep} vars={vars} findingId={findingBySlug.get(rep.slug)} />;
  }

  const siblings = group.members.filter((m) => m.slug !== rep.slug);
  const memberList = (members: Broker[]) =>
    members.map((m, i) => (
      <span key={m.slug}>
        {i > 0 && ', '}
        {m.name}
        {findingBySlug.has(m.slug) && <strong> (in your findings)</strong>}
      </span>
    ));

  const intro = (
    <div className="optout-network">
      {group.note && <p className="name-inputs-note">{group.note}</p>}
      {group.coverage === 'single-submission' ? (
        <p className="optout-network-covers">
          One request covers: {memberList(group.members)}. Tracking it marks every site sent.
        </p>
      ) : (
        // Shared backbone, unverified family-wide removal: promise only what one
        // submission is known to do, and say what tracking will actually record.
        <p className="optout-network-covers">
          One request to this family’s privacy contact asks for removal from all of them, but only{' '}
          <strong>{rep.name}</strong>’s own removal is verified. Tracking it marks {rep.name} sent
          and adds {memberList(siblings)} as re-check to-dos.
        </p>
      )}
      <details className="optout-network-members">
        <summary>Site-by-site links</summary>
        <ul>
          {group.members.map((m) => (
            <li key={m.slug}>
              {m.name}
              {m.searchUrl && (
                <>
                  {' · '}
                  <a href={m.searchUrl} target="_blank" rel="noopener noreferrer">
                    search ↗
                  </a>
                </>
              )}
              {m.optOut.webFormUrl && (
                <>
                  {' · '}
                  <a href={m.optOut.webFormUrl} target="_blank" rel="noopener noreferrer">
                    opt-out form ↗
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );

  return (
    <OptOutGenerator
      broker={rep}
      vars={vars}
      heading={group.name}
      intro={intro}
      trackInputs={groupTrackInputs(group, findingBySlug)}
    />
  );
}
