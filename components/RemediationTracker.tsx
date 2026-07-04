'use client';

// The remediation tracker (Phase 2): the local record of what you've sent and
// where it stands. Re-check dates are shown, never pushed — nothing here leaves
// the device (scope/docs/04-data-model.md). Rows for sites that share one
// opt-out backbone are grouped under the network with one set of controls —
// the data stays one row per broker, only the presentation folds.

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useStorage } from '@/lib/storage/StorageProvider';
import { getBroker } from '@/lib/content/data';
import { Pillar, Remediation, RemediationState } from '@/lib/model/types';

// Where "follow up" leads, per pillar — an existing route, never a dead end.
const PILLAR_HREF: Record<Pillar, string> = {
  optout: '/remediate',
  platform: '/harden',
  breach: '/remediate',
  deadname: '/records',
};

type Filter = 'attention' | 'waiting' | 'draft' | 'corrected' | 'all';

interface TrackerGroup {
  key: string;
  /** Network name when rows share a backbone; otherwise the row's own action. */
  heading?: string;
  rows: Remediation[];
}

/** Fold optout rows whose brokers share a network; everything else stays its own row. */
function groupRows(remediations: Remediation[], locale: string): TrackerGroup[] {
  const groups: TrackerGroup[] = [];
  const byNetwork = new Map<string, TrackerGroup>();
  for (const r of remediations) {
    const network = r.pillar === 'optout' && r.refId ? getBroker(r.refId, locale)?.network : undefined;
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

// The user's LOCAL calendar day — not toISOString(), which is UTC and would
// flag a follow-up due tomorrow as overdue from early evening in the Americas.
const TODAY = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

function shortDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { month: 'short', day: '2-digit' }).toLowerCase();
}

/** A group's bucket for the filter tabs + summary; mutually exclusive. */
function bucketOf(g: TrackerGroup, today: string): Exclude<Filter, 'all'> {
  if (g.rows.every((r) => r.state === 'confirmed')) return 'corrected';
  const attention = g.rows.some(
    (r) => r.state !== 'confirmed' && r.recheckAt && r.recheckAt <= today,
  );
  if (attention) return 'attention';
  if (g.rows.some((r) => r.state === 'sent')) return 'waiting';
  return 'draft'; // still-to-draft (todo / blocked)
}

/**
 * The date shown in a group's meta line. When the group needs attention, it is
 * the EARLIEST overdue recheck among unresolved rows (a mixed group's first
 * row may hold a future date — showing that after "follow-up was" would read
 * as nonsense); otherwise the earliest planned recheck. ISO dates sort
 * lexicographically.
 */
function recheckOf(g: TrackerGroup, today: string): string | undefined {
  const overdue = g.rows
    .filter((r) => r.state !== 'confirmed' && r.recheckAt && r.recheckAt <= today)
    .map((r) => r.recheckAt!)
    .sort();
  if (overdue.length > 0) return overdue[0];
  return g.rows
    .map((r) => r.recheckAt)
    .filter((d): d is string => !!d)
    .sort()[0];
}

export function RemediationTracker() {
  const t = useTranslations('tracker');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { state, updateRemediations, removeRemediations } = useStorage();
  const [filter, setFilter] = useState<Filter>('all');
  const remediations = state?.remediations ?? [];

  if (remediations.length === 0) {
    return (
      <section className="tracker" aria-labelledby="tracker-title">
        <h2 id="tracker-title">{t('title')}</h2>
        <p className="name-inputs-note">{t('empty')}</p>
      </section>
    );
  }

  const today = TODAY();
  const groups = groupRows(remediations, locale);
  const buckets = new Map(groups.map((g) => [g.key, bucketOf(g, today)]));
  const count = (f: Filter) =>
    f === 'all' ? groups.length : groups.filter((g) => buckets.get(g.key) === f).length;
  const attentionN = count('attention');
  const waitingN = count('waiting');
  const draftN = count('draft');
  const correctedN = count('corrected');

  // Entries needing attention sort first; the rest keep insertion order.
  const ordered = groups
    .slice()
    .sort((a, b) => Number(buckets.get(b.key) === 'attention') - Number(buckets.get(a.key) === 'attention'));
  const visible =
    filter === 'all' ? ordered : ordered.filter((g) => buckets.get(g.key) === filter);

  // Every bucket the headline can name has a tab — "to draft" included.
  const TABS: [Filter, string, number][] = [
    ['attention', t('tabAttention'), attentionN],
    ['waiting', t('tabWaiting'), waitingN],
    ['draft', t('tabDraft'), draftN],
    ['corrected', t('tabCorrected'), correctedN],
    ['all', t('tabAll'), groups.length],
  ];

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">{t('title')}</h2>

      <p className="tracker-headline">
        <span className="count">{t('entriesCount', { count: groups.length })}</span>{' '}
        {t('headlineCounts', { corrected: correctedN, waiting: waitingN, draft: draftN })}
        {attentionN > 0 ? (
          <>{t('headlineAttention', { count: attentionN })}</>
        ) : (
          <span className="hl">{t('headlineNone')}</span>
        )}
      </p>

      <ul className="filter-tabs" aria-label={t('tabsAria')}>
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
        <p className="name-inputs-note">{t('emptyView')}</p>
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
            const recheck = recheckOf(g, today);
            const setAll = (patch: Partial<Pick<Remediation, 'state' | 'recheckAt'>>) =>
              updateRemediations(ids, patch);
            const removeAll = () => removeRemediations(ids);
            return (
              <li key={g.key} className="tracker-item">
                <div className="tracker-head">
                  <strong>{g.heading ?? lead.action}</strong>
                  {uniform ? (
                    <span className={`stamp state-${lead.state}`}>{tc(`state.${lead.state}`)}</span>
                  ) : (
                    <span className="stamp state-mixed">{tc('state.mixed')}</span>
                  )}
                </div>
                {g.heading && (
                  <p className="name-inputs-note">
                    {t('covers', {
                      list: g.rows
                        .map((r) => {
                          const name = (r.refId && getBroker(r.refId, locale)?.name) || r.refId;
                          return uniform ? name : `${name} (${tc(`state.${r.state}`).toLowerCase()})`;
                        })
                        .join(', '),
                    })}
                  </p>
                )}
                <div className="tracker-controls">
                  <label>
                    {t('status')}
                    <select
                      value={uniform ? lead.state : 'mixed'}
                      onChange={(e) => setAll({ state: e.target.value as RemediationState })}
                    >
                      {!uniform && (
                        <option value="mixed" disabled>
                          {t('mixedOption')}
                        </option>
                      )}
                      <option value="todo">{t('optionTodo')}</option>
                      <option value="sent">{t('optionSent')}</option>
                      <option value="confirmed">{t('optionConfirmed')}</option>
                      <option value="blocked">{t('optionBlocked')}</option>
                    </select>
                  </label>
                  <label>
                    {t('recheckOn')}
                    <input
                      type="date"
                      value={lead.recheckAt ?? ''}
                      onChange={(e) => setAll({ recheckAt: e.target.value || undefined })}
                    />
                  </label>
                  <button type="button" className="report-broken-link" onClick={removeAll}>
                    {t('remove')}
                  </button>
                </div>
                {recheck && (
                  <div className="tracker-meta">
                    <span className="tracker-dates">
                      {bucket === 'attention' ? (
                        <span className="tracker-attention">
                          {t('followupWas', { date: shortDate(recheck, locale) })}
                        </span>
                      ) : (
                        <>{t('followup', { date: shortDate(recheck, locale) })}</>
                      )}
                    </span>
                    {bucket === 'attention' && (
                      <Link className="tracker-action" href={PILLAR_HREF[lead.pillar]}>
                        {t('draftFollowup')}
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
