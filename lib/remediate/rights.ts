// State-aware rights selection (Phase 2 / M2). Pure functions, no I/O. The
// defining safety rule: deletion rights are sub-national, so we surface a
// region-specific right ONLY to that region, and NEVER imply a right a state
// doesn't grant (a Texas user must never see CCPA framing). We also never fall
// back across countries (scope/docs/03-architecture.md, 04-data-model.md).

import { Law } from '../content/types';
import { Jurisdiction } from '../model/types';

/**
 * Which laws apply to this jurisdiction:
 *   • same country, AND
 *   • either nationally-applicable, OR region-specific to the user's exact region.
 * A nationally-applicable law is shown to everyone in the country (e.g. the
 * voluntary broker opt-out). A region-specific law is shown ONLY when the user's
 * region matches — selecting no region means no region-specific rights are shown.
 * Region-specific laws lead (the specific right is the point); national baseline
 * follows.
 */
export function selectLaws(laws: Law[], jurisdiction: Jurisdiction): Law[] {
  const inCountry = laws.filter((l) => l.jurisdiction.country === jurisdiction.country);
  const applicable = inCountry.filter((l) => {
    if (l.appliesNationally) return true;
    // Region-specific: requires an exact region match — never invented, never
    // shown without the user having declared this region.
    return !!jurisdiction.region && l.jurisdiction.region === jurisdiction.region;
  });
  return applicable.sort((a, b) => {
    const aRegional = !a.appliesNationally ? 0 : 1;
    const bRegional = !b.appliesNationally ? 0 : 1;
    return aRegional - bRegional;
  });
}

/** True when we have authored region-specific law content for this region. */
export function hasRegionalLaw(laws: Law[], jurisdiction: Jurisdiction): boolean {
  return (
    !!jurisdiction.region &&
    laws.some(
      (l) =>
        !l.appliesNationally &&
        l.jurisdiction.country === jurisdiction.country &&
        l.jurisdiction.region === jurisdiction.region,
    )
  );
}
