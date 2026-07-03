'use client';

// The findings ledger: the local, private record that Phase 1 produces and
// Phase 2 will act on. Deadname-exposing findings sort first — the differentiator
// leads the view (scope/docs/04-data-model.md).

import { useStorage } from '@/lib/storage/StorageProvider';
import { Finding, FindingStatus, Priority } from '@/lib/model/types';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// Map a finding's status onto a stamp style + plain-word label (scope/docs/11).
const STATUS_STAMP: Record<FindingStatus, { cls: string; label: string }> = {
  found: { cls: 'state-todo', label: 'to do' },
  in_progress: { cls: 'state-blocked', label: 'in progress' },
  resolved: { cls: 'state-confirmed', label: 'corrected' },
  wont_fix: { cls: 'state-mixed', label: 'monitor' },
};

function sortFindings(a: Finding, b: Finding): number {
  if (a.exposesDeadname !== b.exposesDeadname) return a.exposesDeadname ? -1 : 1;
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

export function FindingsLedger() {
  const { state, updateFinding, removeFinding } = useStorage();
  const findings = [...(state?.findings ?? [])].sort(sortFindings);
  const deadnameCount = findings.filter((f) => f.exposesDeadname).length;

  if (findings.length === 0) {
    return (
      <section className="ledger" aria-labelledby="ledger-title">
        <h2 id="ledger-title">Your ledger</h2>
        <p className="name-inputs-note">
          Nothing here yet. As you work through the steps, add what you find.
        </p>
      </section>
    );
  }

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <h2 id="ledger-title">Your ledger</h2>
      <p className="ledger-headline">
        <span className="count">
          {findings.length} finding{findings.length === 1 ? '' : 's'}.
        </span>{' '}
        {deadnameCount > 0 ? (
          <>
            <span className="hl">
              {deadnameCount} expose your former name
            </span>{' '}
            — those lead the list.
          </>
        ) : (
          <>None expose your former name.</>
        )}
      </p>
      <ul className="ledger-list">
        {findings.map((f) => (
          <li key={f.id} className="finding">
            <div className="finding-head">
              <strong>{f.label}</strong>
              {f.exposesDeadname && <span className="stamp badge-deadname">former name</span>}
              <span className={`stamp ${STATUS_STAMP[f.status].cls}`}>{STATUS_STAMP[f.status].label}</span>
              <span className={`stamp priority-${f.priority}`}>{f.priority}</span>
            </div>
            {f.whatFound && <p className="finding-what">{f.whatFound}</p>}
            <div className="finding-controls">
              <label>
                Status
                <select
                  value={f.status}
                  onChange={(e) => updateFinding(f.id, { status: e.target.value as FindingStatus })}
                >
                  <option value="found">Found</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="wont_fix">Leaving it</option>
                </select>
              </label>
              <label>
                Priority
                <select
                  value={f.priority}
                  onChange={(e) => updateFinding(f.id, { priority: e.target.value as Priority })}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <button type="button" className="report-broken-link" onClick={() => removeFinding(f.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
