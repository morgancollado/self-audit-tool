// Broker network grouping (user-testing feedback: several sites share one
// search/opt-out backbone, so the flow should present "one task per distinct
// engine" instead of one per site). Pure function, no I/O. Grouping is derived
// presentation only — remediations stay keyed by broker slug
// (scope/docs/04-data-model.md).

import { Broker, NetworkCoverage } from '../content/types';
import { NewRemediationInput } from '../model/factory';

export interface BrokerGroup {
  /** Network key, or the broker's own slug for a standalone broker. */
  key: string;
  /** Network display name, or the broker's own name for a standalone broker. */
  name: string;
  note?: string;
  /** True for a real multi-site network; false for a standalone broker. */
  isNetwork: boolean;
  /** What one request is verified to cover; only set for a network. */
  coverage?: NetworkCoverage;
  /** The broker whose opt-out route (template, form, email) the group's card uses. */
  representative: Broker;
  /** All brokers covered by this one task, representative included. */
  members: Broker[];
}

/**
 * Fold a broker list into opt-out tasks: brokers sharing a `network.key` become
 * one group, everything else a single-member group. Input order is preserved by
 * first appearance; members are sorted by slug. The representative is the member
 * flagged `network.representative` — the content declares which site fronts the
 * shared backbone (validator-enforced: exactly one per network), so a new member
 * can never silently swap the route the card uses. First-by-slug is only the
 * fallback for malformed content.
 */
export function groupBrokers(brokers: Broker[]): BrokerGroup[] {
  const groups: BrokerGroup[] = [];
  const byKey = new Map<string, BrokerGroup>();

  for (const broker of brokers) {
    const net = broker.network;
    if (!net) {
      groups.push({
        key: broker.slug,
        name: broker.name,
        isNetwork: false,
        representative: broker,
        members: [broker],
      });
      continue;
    }
    const existing = byKey.get(net.key);
    if (existing) {
      existing.members.push(broker);
    } else {
      const group: BrokerGroup = {
        key: net.key,
        name: net.name,
        note: net.note,
        isNetwork: true,
        coverage: net.coverage,
        representative: broker,
        members: [broker],
      };
      byKey.set(net.key, group);
      groups.push(group);
    }
  }

  for (const group of byKey.values()) {
    group.members.sort((a, b) => a.slug.localeCompare(b.slug));
    group.representative =
      group.members.find((m) => m.network?.representative) ?? group.members[0];
  }
  return groups;
}

/**
 * The tracker rows one send of a group's request creates — one row per member
 * site, honest about coverage. A 'single-submission' network (and a standalone
 * broker) marks every member 'sent'. A 'shared-backbone' network marks only the
 * representative 'sent': the siblings share data and a privacy contact, but
 * their removal isn't verified by that one submission, so they become re-check
 * to-dos instead — a false "sent" would leave a deadname up while the user
 * believes it handled. Row labels never carry the user's names.
 */
export function groupTrackInputs(
  group: BrokerGroup,
  findingIdBySlug: Map<string, string>,
): NewRemediationInput[] {
  const rep = group.representative;
  return group.members.map((m) => {
    const verified = group.coverage !== 'shared-backbone' || m.slug === rep.slug;
    return {
      findingId: findingIdBySlug.get(m.slug),
      pillar: 'optout' as const,
      refId: m.slug,
      action: verified
        ? `Opt-out request to ${m.name}`
        : `Re-check ${m.name} after the ${rep.name} request`,
      state: verified ? ('sent' as const) : ('todo' as const),
    };
  });
}
