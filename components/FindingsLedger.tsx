'use client';

// The findings ledger: the local, private record that Phase 1 produces and
// Phase 2 will act on. Deadname-exposing findings sort first — the differentiator
// leads the view (scope/docs/04-data-model.md).

import { useTranslations } from 'next-intl';
import { useStorage } from '@/lib/storage/StorageProvider';
import { Finding, FindingStatus, Priority } from '@/lib/model/types';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// Map a finding's status onto a stamp style (plain-word labels live in the
// message catalog under ledger.stamp — scope/docs/11).
const STATUS_CLS: Record<FindingStatus, string> = {
  found: 'state-todo',
  in_progress: 'state-blocked',
  resolved: 'state-confirmed',
  wont_fix: 'state-mixed',
};

function sortFindings(a: Finding, b: Finding): number {
  if (a.exposesDeadname !== b.exposesDeadname) return a.exposesDeadname ? -1 : 1;
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

export function FindingsLedger() {
  const t = useTranslations('ledger');
  const tc = useTranslations('common');
  const { state, updateFinding, removeFinding } = useStorage();
  const findings = [...(state?.findings ?? [])].sort(sortFindings);
  const deadnameCount = findings.filter((f) => f.exposesDeadname).length;

  if (findings.length === 0) {
    return (
      <section className="ledger" aria-labelledby="ledger-title">
        <h2 id="ledger-title">{t('title')}</h2>
        <p className="name-inputs-note">{t('empty')}</p>
      </section>
    );
  }

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <h2 id="ledger-title">{t('title')}</h2>
      <p className="ledger-headline">
        <span className="count">{t('findingsCount', { count: findings.length })}</span>{' '}
        {deadnameCount > 0 ? (
          t.rich('deadnameLead', {
            count: deadnameCount,
            hl: (chunks) => <span className="hl">{chunks}</span>,
          })
        ) : (
          <>{t('noneDeadname')}</>
        )}
      </p>
      <ul className="ledger-list">
        {findings.map((f) => (
          <li key={f.id} className="finding">
            <div className="finding-head">
              <strong>{f.label}</strong>
              {f.exposesDeadname && <span className="stamp badge-deadname">{t('formerNameBadge')}</span>}
              <span className={`stamp ${STATUS_CLS[f.status]}`}>{t(`stamp.${f.status}`)}</span>
              <span className={`stamp priority-${f.priority}`}>{tc(`priority.${f.priority}`)}</span>
            </div>
            {f.whatFound && <p className="finding-what">{f.whatFound}</p>}
            <div className="finding-controls">
              <label>
                {t('status')}
                <select
                  value={f.status}
                  onChange={(e) => updateFinding(f.id, { status: e.target.value as FindingStatus })}
                >
                  <option value="found">{t('statusFound')}</option>
                  <option value="in_progress">{t('statusInProgress')}</option>
                  <option value="resolved">{t('statusResolved')}</option>
                  <option value="wont_fix">{t('statusWontFix')}</option>
                </select>
              </label>
              <label>
                {t('priority')}
                <select
                  value={f.priority}
                  onChange={(e) => updateFinding(f.id, { priority: e.target.value as Priority })}
                >
                  <option value="high">{tc('priorityOption.high')}</option>
                  <option value="medium">{tc('priorityOption.medium')}</option>
                  <option value="low">{tc('priorityOption.low')}</option>
                </select>
              </label>
              <button type="button" className="report-broken-link" onClick={() => removeFinding(f.id)}>
                {t('remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
