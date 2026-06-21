'use client';

// One records-class guide (Phase 2 / M2): a deadname's most permanent homes —
// court orders, name-change petitions, web archives, search caches. No-dead-end
// rule: a record either carries actions, or is an explicit monitor-only item with
// harm-reduction (enforced in content). Acting is tracked locally under the
// deadname pillar.

import { useState } from 'react';
import { useStorage } from '@/lib/storage/StorageProvider';
import { DeadnameRecord, RecordClass } from '@/lib/content/types';

const CLASS_LABEL: Record<RecordClass, string> = {
  'court-record': 'Court record',
  'name-change': 'Legal name change',
  school: 'School record',
  'licensing-board': 'Licensing board',
  byline: 'Byline / authorship',
  archive: 'Web archive',
  'search-cache': 'Search cache',
  breach: 'Data breach',
  other: 'Public record',
};

export function RecordGuide({ record }: { record: DeadnameRecord }) {
  const { addRemediation } = useStorage();
  const [tracked, setTracked] = useState(false);
  const monitorOnly = record.monitorOnly === true;
  const label = CLASS_LABEL[record.class];

  const track = async () => {
    await addRemediation({
      findingId: undefined,
      pillar: 'deadname',
      refId: record.slug,
      action: `Records: ${label}`,
      state: 'sent',
    });
    setTracked(true);
  };

  return (
    <section className="record" aria-labelledby={`record-${record.slug}`}>
      <div className="record-head">
        <h3 id={`record-${record.slug}`}>{label}</h3>
        {record.exposesDeadnameRisk && (
          <span className={`badge priority-${record.exposesDeadnameRisk}`}>{record.exposesDeadnameRisk} risk</span>
        )}
      </div>

      <p>{record.whatItIs}</p>

      {record.sealedPetitionAvailable && (
        <p className="record-sealed" role="note">
          <strong>Sealed / confidential petitions:</strong> some states let people at risk change their
          name without it becoming a public record — ask your court or a legal-aid org <em>before</em>{' '}
          you file, since it’s far harder to undo afterward.
        </p>
      )}

      {monitorOnly ? (
        <p className="record-monitor" role="note">
          <strong>Can’t be removed — monitor only.</strong> {record.harmReduction}
        </p>
      ) : (
        <ol className="record-steps">
          {(record.actions ?? []).map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      )}

      {record.disclaimer && <p className="optout-disclaimer">{record.disclaimer}</p>}
      <p className="content-verified">Last verified {record.lastVerified}.</p>

      {!monitorOnly && (
        <div className="optout-track">
          {tracked ? (
            <span className="optout-tracked">Added to your tracker ✓</span>
          ) : (
            <button type="button" onClick={track}>
              I’ve handled this — track it
            </button>
          )}
        </div>
      )}
    </section>
  );
}
