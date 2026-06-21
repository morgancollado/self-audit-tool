// "Report this guide is broken" — builds a prefilled GitHub issue URL.
//
// This is Errata's ONLY staleness-signal channel: with zero analytics, we learn
// a broker/platform flow has rotted only when a user tells us. Critically it
// carries NO personal data — only the content identifier, the guide type, the
// app/content version, and a free-text note the user writes (with an explicit
// warning not to include personal info). Submitting is a plain top-level
// navigation to github.com; nothing is sent through Errata.

export interface BrokenReport {
  /** Content slug, e.g. "spokeo". Never a user's name. */
  refId: string;
  /** Which kind of guide. */
  kind: 'broker' | 'platform' | 'law' | 'record' | 'template';
  /** Human label for the guide, e.g. "Spokeo". */
  label: string;
  /** Content/app version so we know what they saw. */
  contentVersion?: string;
  /** What's wrong, in the user's words. PII-stripped by caller/UI guidance. */
  note?: string;
  /** lastVerified date shown to the user, if any. */
  lastVerified?: string;
}

const REPO = 'morgancollado/self-audit-tool';
const MAX_NOTE = 1000;

// Defense-in-depth: strip the obvious PII shapes (emails, long digit runs that
// could be phone/SSN/IDs) even though the UI also warns the user. Not a
// guarantee — the UI copy is the primary control — but it removes the easy
// footguns before anything reaches a public issue tracker.
export function scrubNote(input: string): string {
  return input
    .slice(0, MAX_NOTE)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[removed]')
    .replace(/\b\d[\d ().-]{6,}\d\b/g, '[removed]')
    .trim();
}

export function buildIssueUrl(report: BrokenReport, repo: string = REPO): string {
  const title = `[stale] ${report.kind}: ${report.label} (${report.refId})`;

  const bodyLines = [
    '<!-- Thanks for flagging a broken/out-of-date guide. -->',
    '<!-- IMPORTANT: do NOT include your name, deadname, address, email, or any personal info. -->',
    '',
    `**Guide:** ${report.label}`,
    `**Type:** ${report.kind}`,
    `**Ref:** \`${report.refId}\``,
    `**Content version:** ${report.contentVersion ?? 'unknown'}`,
    `**Shown "last verified":** ${report.lastVerified ?? 'n/a'}`,
    '',
    '**What looks wrong:**',
    report.note ? scrubNote(report.note) : '_(describe what changed — a moved link, a step that no longer works, etc.)_',
  ];

  const params = new URLSearchParams({
    title,
    body: bodyLines.join('\n'),
    labels: 'content-staleness',
  });

  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}
