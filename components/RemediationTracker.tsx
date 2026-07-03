'use client';

// The remediation tracker (Phase 2): the local record of what you've sent and
// where it stands. Re-check dates are shown, never pushed — nothing here leaves
// the device (scope/docs/04-data-model.md). Rows for sites that share one
// opt-out backbone are grouped under the network with one set of controls —
// the data stays one row per broker, only the presentation folds.

import { useState } from 'react';
import Link from 'next/link';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getBroker } from '@/lib/content/data';
import { Pillar, Remediation, RemediationState } from '@/lib/model/types';

// Plain-word stamp labels — no proofreader jargon (scope/docs/11-brand.md).
const STATE_LABEL: Record<RemediationState, string> = {
  todo: 'to do',
  sent: 'sent',
  confirmed: 'corrected',
  blocked: 'blocked',
};

// Where "follow up" leads, per pillar — an existing route, never a dead end.
const PILLAR_HREF: Record<Pillar, string> = {
  optout: '/remediate',
  platform: '/harden',
  breach: '/remediate',
  deadname: '/records',
};

type Filter = 'attention' | 'waiting' | 'corrected' | 'all';

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

const TODAY = () => new Date().toISOString().slice(0, 10);

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toLowerCase();
}

/** A group's bucket for the filter tabs + summary; mutually exclusive. */
function bucketOf(g: TrackerGroup, today: string): Filter {
  if (g.rows.every((r) => r.state === 'confirmed')) return 'corrected';
  const attention = g.rows.some(
    (r) => r.state !== 'confirmed' && r.recheckAt && r.recheckAt <= today,
  );
  if (attention) return 'attention';
  if (g.rows.some((r) => r.state === 'sent')) return 'waiting';
  return 'all'; // still-to-draft (todo / blocked)
}

export function RemediationTracker() {
  const { state, updateRemediations, removeRemediations } = useStorage();
  const [filter, setFilter] = useState<Filter>('all');
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

  const today = TODAY();
  const groups = groupRows(remediations);
  const buckets = new Map(groups.map((g) => [g.key, bucketOf(g, today)]));
  const count = (f: Filter) =>
    f === 'all' ? groups.length : groups.filter((g) => buckets.get(g.key) === f).length;
  const attentionN = count('attention');
  const waitingN = count('waiting');
  const correctedN = count('corrected');

  // Entries needing attention sort first; the rest keep insertion order.
  const ordered = groups
    .slice()
    .sort((a, b) => Number(buckets.get(b.key) === 'attention') - Number(buckets.get(a.key) === 'attention'));
  const visible =
    filter === 'all' ? ordered : ordered.filter((g) => buckets.get(g.key) === filter);

  const TABS: [Filter, string, number][] = [
    ['attention', 'Needs attention', attentionN],
    ['waiting', 'Waiting', waitingN],
    ['corrected', 'Corrected', correctedN],
    ['all', 'All', groups.length],
  ];

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">Your tracker</h2>

      <p className="tracker-headline">
        <span className="count">
          {groups.length} {groups.length === 1 ? 'entry' : 'entries'}.
        </span>{' '}
        {correctedN} corrected, {waitingN} waiting on replies, {count('all') - correctedN - waitingN - attentionN}{' '}
        to draft —{' '}
        {attentionN > 0 ? (
          <>
            {attentionN} {attentionN === 1 ? 'needs' : 'need'} a follow-up now, below.
          </>
        ) : (
          <span className="hl">nothing needs you today</span>
        )}
      </p>

      <ul className="filter-tabs" aria-label="Filter tracked entries">
        {TABS.map(([f, label, n]) => (
          <li key={f}>
            <button
              type="button"
              className="filter-tab"
              aria-current={filter === f ? 'true' : undefined}
              onClick={() => setFilter(f)}
            >
              {label} ({n})
            </button>
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="name-inputs-note">Nothing in this view.</p>
      ) : (
        <ul className="tracker-list">
          {visible.map((g) => {
            const lead = g.rows[0];
            const ids = g.rows.map((r) => r.id);
            // Grouped rows can legitimately diverge (a shared-backbone network
            // tracks its representative 'sent' and siblings 'todo'), so never show
            // one row's state as the group's: badge it "mixed" and put each site's
            // own state in the covers line. The shared controls still write all
            // rows at once — one batch write, no per-row races.
            const uniform = g.rows.every((r) => r.state === lead.state);
            const bucket = buckets.get(g.key);
            const recheck = g.rows.find((r) => r.recheckAt)?.recheckAt;
            const setAll = (patch: Partial<Pick<Remediation, 'state' | 'recheckAt'>>) =>
              updateRemediations(ids, patch);
            const removeAll = () => removeRemediations(ids);
            return (
              <li key={g.key} className="tracker-item">
                <div className="tracker-head">
                  <strong>{g.heading ?? lead.action}</strong>
                  {uniform ? (
                    <span className={`stamp state-${lead.state}`}>{STATE_LABEL[lead.state]}</span>
                  ) : (
                    <span className="stamp state-mixed">mixed</span>
                  )}
                </div>
                {g.heading && (
                  <p className="name-inputs-note">
                    Covers{' '}
                    {g.rows
                      .map((r) => {
                        const name = (r.refId && getBroker(r.refId)?.name) || r.refId;
                        return uniform ? name : `${name} (${STATE_LABEL[r.state].toLowerCase()})`;
                      })
                      .join(', ')}
                    .
                  </p>
                )}
                <div className="tracker-controls">
                  <label>
                    Status
                    <select
                      value={uniform ? lead.state : 'mixed'}
                      onChange={(e) => setAll({ state: e.target.value as RemediationState })}
                    >
                      {!uniform && (
                        <option value="mixed" disabled>
                          Mixed — pick one to set all
                        </option>
                      )}
                      <option value="todo">To do</option>
                      <option value="sent">Sent</option>
                      <option value="confirmed">Corrected</option>
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
                {recheck && (
                  <div className="tracker-meta">
                    <span className="tracker-dates">
                      {bucket === 'attention' ? (
                        <span className="tracker-attention">follow-up was {shortDate(recheck)}</span>
                      ) : (
                        <>follow-up {shortDate(recheck)}</>
                      )}
                    </span>
                    {bucket === 'attention' && (
                      <Link className="tracker-action" href={PILLAR_HREF[lead.pillar]}>
                        Draft the follow-up →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
