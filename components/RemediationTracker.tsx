'use client';

// The remediation tracker (Phase 2): the local record of what you've sent and
// where it stands. Re-check dates are shown, never pushed — nothing here leaves
// the device (scope/docs/04-data-model.md). Rows for sites that share one
// opt-out backbone are grouped under the network with one set of controls —
// the data stays one row per broker, only the presentation folds.

import { useStorage } from '@/lib/storage/StorageProvider';
import { getBroker } from '@/lib/content/data';
import { Remediation, RemediationState } from '@/lib/model/types';

const STATE_LABEL: Record<RemediationState, string> = {
  todo: 'To do',
  sent: 'Sent',
  confirmed: 'Confirmed',
  blocked: 'Blocked',
};

interface TrackerGroup {
  key: string;
  /** Network name when rows share a backbone; otherwise the row's own action. */
  heading?: string;
  rows: Remediation[];
}

/** Fold optout rows whose brokers share a network; everything else stays its own row. */
function groupRows(remediations: Remediation[]): TrackerGroup[] {
  const groups: TrackerGroup[] = [];
  const byNetwork = new Map<string, TrackerGroup>();
  for (const r of remediations) {
    const network = r.pillar === 'optout' && r.refId ? getBroker(r.refId)?.network : undefined;
    if (!network) {
      groups.push({ key: r.id, rows: [r] });
      continue;
    }
    const existing = byNetwork.get(network.key);
    if (existing) {
      existing.rows.push(r);
    } else {
      const group: TrackerGroup = { key: `network-${network.key}`, heading: network.name, rows: [r] };
      byNetwork.set(network.key, group);
      groups.push(group);
    }
  }
  return groups;
}

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

  const groups = groupRows(remediations);

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">Your tracker</h2>
      <ul className="tracker-list">
        {groups.map((g) => {
          // Grouped rows are only ever written through these shared controls, so
          // the first row is representative; looping keeps stragglers in sync.
          const lead = g.rows[0];
          const setAll = (patch: Partial<Pick<Remediation, 'state' | 'recheckAt'>>) =>
            g.rows.forEach((r) => updateRemediation(r.id, patch));
          const removeAll = () => g.rows.forEach((r) => removeRemediation(r.id));
          return (
            <li key={g.key} className="tracker-item">
              <div className="tracker-head">
                <strong>{g.heading ?? lead.action}</strong>
                <span className={`badge state-${lead.state}`}>{STATE_LABEL[lead.state]}</span>
              </div>
              {g.heading && (
                <p className="name-inputs-note">
                  Covers {g.rows.map((r) => (r.refId && getBroker(r.refId)?.name) || r.refId).join(', ')}.
                </p>
              )}
              <div className="tracker-controls">
                <label>
                  Status
                  <select
                    value={lead.state}
                    onChange={(e) => setAll({ state: e.target.value as RemediationState })}
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
                    value={lead.recheckAt ?? ''}
                    onChange={(e) => setAll({ recheckAt: e.target.value || undefined })}
                  />
                </label>
                <button type="button" className="report-broken-link" onClick={removeAll}>
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
