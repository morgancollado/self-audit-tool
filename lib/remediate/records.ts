// Records-class selection (Phase 2 / M2). Pure functions, no I/O. Records cover
// the deadname's most permanent homes — court orders, name-change petitions, web
// archives, search caches. Jurisdiction handling mirrors the rest of the content
// layer: a record with no jurisdiction is global; a country-scoped record shows
// only within that country; a region-scoped record shows ONLY on an exact region
// match. Never cross-country (scope/docs/03-architecture.md, 04-data-model.md).

import { DeadnameRecord } from '../content/types';
import { Jurisdiction, Priority } from '../model/types';

const RISK_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// Region-specific first (the most precise guidance leads), then nationwide, then
// global — within each tier, highest deadname risk first.
function tier(record: DeadnameRecord): number {
  if (!record.jurisdiction) return 2; // global
  return record.jurisdiction.region ? 0 : 1;
}

export function selectRecords(records: DeadnameRecord[], jurisdiction: Jurisdiction): DeadnameRecord[] {
  const applicable = records.filter((r) => {
    if (!r.jurisdiction) return true; // global — applies everywhere
    if (r.jurisdiction.country !== jurisdiction.country) return false; // never cross-country
    if (r.jurisdiction.region) return r.jurisdiction.region === jurisdiction.region; // exact region only
    return true; // nationwide within the country
  });
  return applicable.sort((a, b) => {
    const t = tier(a) - tier(b);
    if (t !== 0) return t;
    return RISK_ORDER[a.exposesDeadnameRisk ?? 'medium'] - RISK_ORDER[b.exposesDeadnameRisk ?? 'medium'];
  });
}
