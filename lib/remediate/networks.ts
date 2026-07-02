// Broker network grouping (user-testing feedback: several sites share one
// search/opt-out backbone, so the flow should present "one task per distinct
// engine" instead of one per site). Pure function, no I/O. Grouping is derived
// presentation only — remediations stay keyed by broker slug
// (scope/docs/04-data-model.md).

import { Broker } from '../content/types';

export interface BrokerGroup {
  /** Network key, or the broker's own slug for a standalone broker. */
  key: string;
  /** Network display name, or the broker's own name for a standalone broker. */
  name: string;
  note?: string;
  /** True for a real multi-site network; false for a standalone broker. */
  isNetwork: boolean;
  /** The broker whose opt-out route (template, form, email) the group's card uses. */
  representative: Broker;
  /** All brokers covered by this one task, representative included. */
  members: Broker[];
}

/**
 * Fold a broker list into opt-out tasks: brokers sharing a `network.key` become
 * one group, everything else a single-member group. Input order is preserved by
 * first appearance; members are sorted by slug and the representative is the
 * first member — deterministic, and today it lands on the member that fronts
 * the shared backbone (addresses → PeopleConnect suppression center,
 * beenverified → the BeenVerified-family engine).
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
        representative: broker,
        members: [broker],
      };
      byKey.set(net.key, group);
      groups.push(group);
    }
  }

  for (const group of byKey.values()) {
    group.members.sort((a, b) => a.slug.localeCompare(b.slug));
    group.representative = group.members[0];
  }
  return groups;
}
