'use client';

// The remediation tracker (Phase 2): the local record of what you've sent and
// where it stands. Re-check dates are shown, never pushed — nothing here leaves
// the device (scope/docs/04-data-model.md).

import { useStorage } from '@/lib/storage/StorageProvider';
import { RemediationState } from '@/lib/model/types';

const STATE_LABEL: Record<RemediationState, string> = {
  todo: 'To do',
  sent: 'Sent',
  confirmed: 'Confirmed',
  blocked: 'Blocked',
};

export function RemediationTracker() {
  const { state, updateRemediation, removeRemediation } = useStorage();
  const remediations = state?.remediations ?? [];

  if (remediations.length === 0) {
    return (
      <section className="tracker" aria-labelledby="tracker-title">
        <h2 id="tracker-title">Your tracker</h2>
        <p className="name-inputs-note">
          Nothing tracked yet. When you send an opt-out, add it here so you remember to re-check —
          brokers often re-list.
        </p>
      </section>
    );
  }

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">Your tracker</h2>
      <ul className="tracker-list">
        {remediations.map((r) => (
          <li key={r.id} className="tracker-item">
            <div className="tracker-head">
              <strong>{r.action}</strong>
              <span className={`badge state-${r.state}`}>{STATE_LABEL[r.state]}</span>
            </div>
            <div className="tracker-controls">
              <label>
                Status
                <select
                  value={r.state}
                  onChange={(e) => updateRemediation(r.id, { state: e.target.value as RemediationState })}
                >
                  <option value="todo">To do</option>
                  <option value="sent">Sent</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
              <label>
                Re-check on
                <input
                  type="date"
                  value={r.recheckAt ?? ''}
                  onChange={(e) => updateRemediation(r.id, { recheckAt: e.target.value || undefined })}
                />
              </label>
              <button type="button" className="report-broken-link" onClick={() => removeRemediation(r.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
