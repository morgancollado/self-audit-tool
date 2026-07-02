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
  // The address is left verbatim: it comes from our own vetted content (a single,
  // clean address), and percent-encoding the '@' (or a comma-separated recipient
  // list) breaks some mail clients' parsing of the `to`.
  return `mailto:${to}?${query}`;
}

/** Which of the user's names the broker's listing is filed under. */
export type ListedUnder = 'current' | 'former';

/**
 * When the current-name and former-name requests are sent as a PAIR (the
 * "both names" flow — one request per listing, neither carrying the other
 * name), a shared reply channel is itself the linkage: two requests arriving
 * from one email address tell the broker the names belong together (R13).
 * True when the vars would put the same contact on both requests.
 */
export function pairSharesContact(vars: OptOutVars): boolean {
  return !isBlank(vars.email);
}

export interface GenerateOptOutOpts {
  /**
   * Which name the listing is filed under. The opt-out paradox cuts both ways
   * (R13): if the record is under the FORMER name, the request must carry it to
   * match the record — and disclosing the CURRENT name is then the linkage. If
   * it's under the CURRENT name, the former name is the linkage. We always key
   * the request on the listing's own name and make the *other* name opt-in.
   */
  listedUnder: ListedUnder;
  /**
   * Include the user's other name (the one the listing is NOT under). This is the
   * linkage disclosure in both directions; the UI defaults it OFF everywhere.
   */
  includeOtherName: boolean;
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
  /** The former name appears in this request (whether as the primary or the opt-in name). */
  includesFormerName: boolean;
  /** The current name appears in this request (whether as the primary or the opt-in name). */
  includesCurrentName: boolean;
  /** The opt-out itself discloses the current<->former linkage to this custodian. */
  exposesLinkage: boolean;
  /** True when the request has no identifying name at all (the user hasn't filled their details). */
  missingPrimaryName: boolean;
  requiresId: boolean;
  disclaimer: string;
}

/**
 * Build the opt-out artifact for a broker from a template and the transient vars.
 * The request is keyed on the name the listing is filed under (`opts.listedUnder`);
 * the user's *other* name is written in only when `opts.includeOtherName` is set —
 * the UI defaults that OFF everywhere, so neither name is ever broadcast to a new
 * custodian without an explicit, informed choice (the opt-out paradox, R13).
 */
export function generateOptOut(
  broker: Broker,
  template: OptOutTemplate,
  vars: OptOutVars,
  opts: GenerateOptOutOpts,
): GeneratedOptOut {
  const { listedUnder, includeOtherName } = opts;
  // Key the request on the name the record is actually under; the other name is
  // the linkage disclosure and only ever written in on opt-in.
  const primary = listedUnder === 'former' ? vars.aliases : vars.name;
  const other = listedUnder === 'former' ? vars.name : vars.aliases;
  const otherName = includeOtherName ? other : undefined;

  const values: Partial<Record<TemplateVar, string>> = {
    name: primary,
    // `aliases` is the template's "also listed under" slot — used here for
    // whichever name is the secondary one, and dropped entirely when not opted in.
    aliases: otherName,
    location: vars.location,
    email: vars.email,
    brokerName: broker.name,
  };

  const subject = fillOptOutText(template.subject, values);
  const body = fillOptOutText(template.body, values);

  // A format is offered only if the broker can actually receive it. `mailto`
  // needs an email contact; everything else (copy text, printable letter) is
  // always available for the user to send by hand.
  const hasEmail = broker.optOut.methods.includes('email') && !!broker.optOut.email;
  const formats = template.formats.filter((f) => (f === 'mailto' ? hasEmail : true));

  const formerPresent = listedUnder === 'former' ? !isBlank(primary) : !isBlank(otherName);
  const currentPresent = listedUnder === 'current' ? !isBlank(primary) : !isBlank(otherName);

  return {
    brokerSlug: broker.slug,
    brokerName: broker.name,
    formats,
    subject,
    body,
    mailtoUrl: hasEmail ? buildMailto(broker.optOut.email!, subject, body) : undefined,
    includesFormerName: formerPresent,
    includesCurrentName: currentPresent,
    exposesLinkage: broker.optOut.optOutExposesLinkage ?? false,
    missingPrimaryName: isBlank(primary),
    requiresId: broker.optOut.requiresId,
    disclaimer: template.disclaimer,
  };
}
