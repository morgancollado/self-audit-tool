'use client';

// One records-class guide (Phase 2 / M2): a deadname's most permanent homes —
// court orders, name-change petitions, web archives, search caches. No-dead-end
// rule: a record either carries actions, or is an explicit monitor-only item with
// harm-reduction (enforced in content). Acting is tracked locally under the
// deadname pillar.

import { useLocale, useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { DeadnameRecord } from '@/lib/content/types';
import { UntranslatedNote } from './UntranslatedNote';
import { formatContentDate } from '@/lib/content/format-date';

export function RecordGuide({ record }: { record: DeadnameRecord }) {
  const t = useTranslations('recordGuide');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { state, addRemediation } = useStorage();
  const monitorOnly = record.monitorOnly === true;
  const label = t(`className.${record.class}`);
  // Derive "tracked" from the shared tracker (keyed by pillar+refId), not local
  // state — so removing the row in the tracker re-renders the button here.
  const tracked = (state?.remediations ?? []).some(
    (r) => r.pillar === 'deadname' && r.refId === record.slug,
  );

  const track = async () => {
    await addRemediation({
      findingId: undefined,
      pillar: 'deadname',
      refId: record.slug,
      action: t('trackerAction', { label }),
      state: 'sent',
    });
  };

  return (
    <section className="record" aria-labelledby={`record-${record.slug}`}>
      <div className="record-head">
        <h3 id={`record-${record.slug}`}>{label}</h3>
        {record.exposesDeadnameRisk && (
          <span className={`stamp priority-${record.exposesDeadnameRisk}`}>
            {tc('riskStamp', { risk: record.exposesDeadnameRisk })}
          </span>
        )}
      </div>

      <UntranslatedNote item={record} />
      <p>{record.whatItIs}</p>

      {record.sealedPetitionAvailable && (
        <p className="record-sealed" role="note">
          {t.rich('sealedNote', {
            strong: (chunks) => <strong>{chunks}</strong>,
            em: (chunks) => <em>{chunks}</em>,
          })}
        </p>
      )}

      {monitorOnly ? (
        <p className="record-monitor" role="note">
          {t.rich('monitorNote', {
            harmReduction: record.harmReduction ?? '',
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      ) : (
        <ol className="record-steps">
          {(record.actions ?? []).map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      )}

      {record.disclaimer && <p className="optout-disclaimer">{record.disclaimer}</p>}
      <p className="content-verified">
        {tc('lastVerified', { date: formatContentDate(record.lastVerified, locale) })}
      </p>

      {!monitorOnly && (
        <div className="optout-track">
          {tracked ? (
            <span className="optout-tracked">{t('tracked')}</span>
          ) : (
            <button type="button" onClick={track}>
              {t('trackIt')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
