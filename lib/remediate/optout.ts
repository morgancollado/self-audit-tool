// Opt-out request generation (Phase 2 / M2). Pure functions, no I/O. Artifacts
// are built in memory from the user's transient input at generation time and are
// never written back unless the user opted into name retention — the
// architectural expression of the 95% rule: we prepare everything, the user
// presses send (scope/docs/03-architecture.md, 04-data-model.md).

import { Broker, OptOutFormat, OptOutTemplate, TemplateVar } from '../content/types';

/**
 * Transient identity for an opt-out request. `aliases` is the former name — the
 * current<->deadname linkage — and is OPT-IN: omit it and the request carries no
 * deadname (the opt-out paradox, R13). `brokerName` is filled from content, not
 * the user.
 */
export type OptOutVars = Partial<Record<Exclude<TemplateVar, 'brokerName'>, string>>;

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

function isBlank(v: string | undefined): boolean {
  return !v || v.trim() === '';
}

/**
 * Fill placeholders line by line, dropping any line that references a placeholder
 * whose value is blank (the optional-field-line pattern: a blank "Location:" line
 * disappears instead of leaving a broken {{location}} in the artifact). Lines
 * with no placeholders are always kept.
 */
export function fillOptOutText(text: string, values: Partial<Record<TemplateVar, string>>): string {
  return text
    .split('\n')
    .filter((line) => {
      const used = [...line.matchAll(PLACEHOLDER_RE)].map((m) => m[1] as TemplateVar);
      return used.every((key) => !isBlank(values[key]));
    })
    .map((line) => line.replace(PLACEHOLDER_RE, (_m, key: string) => values[key as TemplateVar]!.trim()))
    .join('\n');
}

/**
 * A `mailto:` deep link. The user's own mail client opens pre-filled; the send is
 * always their keystroke — nothing is transmitted by Errata.
 */
export function buildMailto(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  // URLSearchParams encodes spaces as '+', which some mail clients mishandle in
  // the body; mailto wants %20.
  const query = params.toString().replace(/\+/g, '%20');
  return `mailto:${encodeURIComponent(to)}?${query}`;
}

export interface GeneratedOptOut {
  brokerSlug: string;
  brokerName: string;
  /** Output formats this broker actually supports (intersection of template + contact methods). */
  formats: OptOutFormat[];
  subject: string;
  /** Ready-to-copy / ready-to-paste request body. */
  body: string;
  /** Present only when the broker accepts email and has a contact address. */
  mailtoUrl?: string;
  /** True when the user chose to include their former name in this request. */
  includesFormerName: boolean;
  /** The opt-out itself discloses the current<->former linkage to this custodian. */
  exposesLinkage: boolean;
  requiresId: boolean;
  disclaimer: string;
}

/**
 * Build the opt-out artifact for a broker from a template and the transient vars.
 * `includeAliases` gates whether the former name is written into the request at
 * all; the UI defaults it OFF for linkage-exposing brokers.
 */
export function generateOptOut(
  broker: Broker,
  template: OptOutTemplate,
  vars: OptOutVars,
  includeAliases: boolean,
): GeneratedOptOut {
  const values: Partial<Record<TemplateVar, string>> = {
    name: vars.name,
    location: vars.location,
    email: vars.email,
    brokerName: broker.name,
    // The linkage is only ever written in when explicitly opted in.
    aliases: includeAliases ? vars.aliases : undefined,
  };

  const subject = fillOptOutText(template.subject, values);
  const body = fillOptOutText(template.body, values);

  // A format is offered only if the broker can actually receive it. `mailto`
  // needs an email contact; everything else (copy text, printable letter) is
  // always available for the user to send by hand.
  const hasEmail = broker.optOut.methods.includes('email') && !!broker.optOut.email;
  const formats = template.formats.filter((f) => (f === 'mailto' ? hasEmail : true));

  const includesFormerName = includeAliases && !isBlank(vars.aliases);

  return {
    brokerSlug: broker.slug,
    brokerName: broker.name,
    formats,
    subject,
    body,
    mailtoUrl: hasEmail ? buildMailto(broker.optOut.email!, subject, body) : undefined,
    includesFormerName,
    exposesLinkage: broker.optOut.optOutExposesLinkage ?? false,
    requiresId: broker.optOut.requiresId,
    disclaimer: template.disclaimer,
  };
}
