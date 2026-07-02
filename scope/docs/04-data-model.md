# 04 — Client-Side Data Model

Defines **exactly what is stored locally**, in what shape, and the
export/import + wipe semantics. Nothing here ever leaves the device except the
backup file the user explicitly exports.

## Storage tiers

| Store | Tech | Holds | Why |
|-------|------|-------|-----|
| Preferences | `localStorage` | locale, jurisdiction, content-warning prefs, storage-mode flag, UI state | small, synchronous, fine to lose |
| Audit state | `IndexedDB` | findings log, remediation tracker, progress | structured, can grow, queryable |
| Ephemeral | in-memory only | everything, when session-only mode is on | persists nothing to disk |

**Never stored:** the user's name or deadname as a *required* persisted field.
Names are entered transiently to *generate* search prompts and opt-out letters;
the user may **optionally** save them locally to avoid retyping, behind an
explicit, clearly-labeled toggle that is **off by default** (entering a deadname
into a tool that remembers it is exactly the honeypot we must avoid by default).
When off, generated artifacts are produced in-memory and not written back.

## Schema (TypeScript-style, illustrative)

```ts
// Top-level persisted document (IndexedDB), single record keyed "audit"
interface AuditState {
  schemaVersion: number;            // for migrations
  createdAt: string;                // ISO; coarse, no time-of-day precision needed
  updatedAt: string;
  // Hierarchical jurisdiction — rights are sub-national in the US.
  // country drives broker set; region drives which rights/mechanisms apply.
  jurisdiction: {
    country: "us" | "co";
    region?: string;                // e.g. "CA", "TX" — gates CCPA/CPRA/DROP etc.
  };
  // Optional, off-by-default identity (see warning above)
  identity?: {
    rememberNames: boolean;         // mirrors the toggle
    names?: string[];               // current + former; only if rememberNames
    locationHints?: string[];       // city/employer used in searches
  };
  findings: Finding[];
  remediations: Remediation[];
  progress: Progress;
}

interface Finding {
  id: string;                       // local uuid
  source: "broker" | "search" | "platform" | "records" | "other";
  refId?: string;                   // -> content item (e.g., broker slug) if applicable
  label: string;                    // user-facing "where" (e.g., "Spokeo")
  whatFound: string;                // free text, user's own words
  exposesDeadname: boolean;         // first-class flag — the differentiator
  priority: "high" | "medium" | "low";
  status: "found" | "in_progress" | "resolved" | "wont_fix";
  // No-dead-end rule: every finding either resolves to an action or is
  // honestly marked unremediable (monitor-only). The UI must never render a
  // finding with neither. `actionable:false` items are demoted to a footnote.
  actionable: boolean;
  harmReduction?: string;           // shown when !actionable (e.g., rotate password)
  notes?: string;
  createdAt: string;
}

interface Remediation {
  id: string;
  findingId?: string;               // link back to a Finding
  pillar: "optout" | "platform" | "breach" | "deadname";
  refId?: string;                   // -> content item (broker/platform/playbook)
  action: string;                   // e.g., "Sent CCPA email", "Submitted DROP request"
  state: "todo" | "sent" | "confirmed" | "blocked";
  recheckAt?: string;               // user-set reminder date (shown, not pushed)
  notes?: string;
  updatedAt: string;
}

interface Progress {
  discoverCompletedSteps: string[]; // content step ids
  remediateCompletedSteps: string[];
  lastVisitedRoute?: string;        // for resume
}
```

Notes:
- **`exposesDeadname` is a first-class field** on findings, so the UI can sort,
  count, and prioritize deadname exposure distinctly — this is the product's
  reason to exist, not a tag buried in free text.
- IDs are local UUIDs; no server-issued identifiers, nothing correlatable across
  devices.
- Content items (brokers/platforms/laws) are **referenced by slug** (`refId`),
  never copied into user state — keeps user data tiny and content updatable.
- Broker **networks** (shared opt-out backbones) are derived presentation: the UI
  groups by the content-side `network.key`, but remediations are still written
  one row per broker slug — no network identifiers enter user state.
- Network `coverage` decides what those rows say. `single-submission` (one
  request verifiably removes every member) marks every member `sent`;
  `shared-backbone` (family-wide removal unverified) marks only the
  `representative` member `sent` and the siblings `todo` as re-check tasks — a
  false "sent" would leave a deadname up while the user believes it handled.
- Audit-state writes are **serialized** in `AuditStore.update` (read-modify-write
  behind a promise chain), so multi-row batch actions and concurrent callers
  can't lose each other's updates.

## Export / import

- **Export:** serializes `AuditState` and writes a backup the user downloads.
  Includes `schemaVersion`. Contains whatever the user chose to save (so if
  `rememberNames` is off, names aren't in the file).
- **Encrypted by default (revised — was a `Could`, now a Must):** the export is
  **passphrase-encrypted by default** (e.g. WebCrypto AES-GCM + a strong KDF).
  The backup can contain the deadname, and a downloaded file typically lands in
  a **Downloads folder that auto-syncs to iCloud/Google Drive** — i.e. the exact
  cloud exposure the architecture forbids. A plaintext export is available only
  as an explicit, warned opt-out. See [06](06-risk-register.md) R14.
- **Import:** detects encrypted vs plaintext; prompts for the passphrase if
  needed; validates `schemaVersion` (run migrations if older), then either
  **replaces** or **merges** (offer the choice; default replace for
  predictability). Reject malformed/undecryptable files with a calm error.

## Wipe semantics

- **`wipeAll()`** (panic-delete): clears IndexedDB database(s) +
  app's `localStorage` keys + in-memory state, then hard-reloads to a neutral
  landing screen. Must be:
  - **Always reachable** (persistent control, every screen, keyboard-accessible).
  - **Instant and unconfirmed by default** (a panic button that asks "are you
    sure?" can fail the user in the moment) — but pair it with an easily
    discoverable **export-first** option elsewhere so accidental loss is
    recoverable for non-panic situations. Document this tension; lean toward
    *instant* for the panic control.
  - **Thorough:** also clear caches the app created; do not rely on the browser
    to GC IndexedDB.
- **Ephemeral mode** is the proactive counterpart: choose it up front and
  nothing is ever written, so there is nothing to wipe.

## Migrations

- A single `schemaVersion` integer; a small ordered list of migration functions
  run on load/import when the stored version is older. Keep migrations pure and
  local. Never silently drop user data; if a migration can't proceed, surface it
  and offer export of the raw state.

## What an attacker with the device sees (threat note)

Even with all of the above, **device access defeats local-only storage**. The
mitigations are: ephemeral mode, panic-delete, off-by-default name retention,
and explicit warnings — not a promise of secrecy against someone holding the
unlocked device. The data model is honest about this; the UI must be too.

### Panic-delete's honest scope (state it where the button lives)

`wipeAll()` clears *our* state. It **cannot** clear browser history, the DNS
cache, form autofill, an already-downloaded export file, or the fact that the
site was visited. Panic-delete that implies a full trace-wipe gives false
confidence in the exact moment a user is most at risk. The control's copy must
scope what it does and does not cover, and point to ephemeral mode as the
proactive counterpart (nothing is ever written, so there is nothing — and no
trace in *our* storage — to wipe).

## Storage durability (the "resume later" promise has platform limits)

The resumable-progress promise quietly fails on some browsers:

- **iOS Safari evicts IndexedDB (and other site storage) after ~7 days of no
  interaction** with the site. A user who paces themselves over weeks — exactly
  the trauma-informed model we want — can return to find the findings log gone,
  silently.
- Private/incognito modes wipe on close; storage quotas and eviction policies
  differ across browsers.

**Mitigation:** detect storage persistence where possible
(`navigator.storage.persist()`), surface an honest per-platform note, and
**nudge an (encrypted) export as the durable backup** rather than implying
local storage is permanent. The "resume later" copy must not over-promise.

## A data-shape note on the opt-out paradox

Getting a broker to suppress a deadname often requires *telling* that broker the
current name maps to the deadname (and sometimes sending ID) — handing a fresh
`current ↔ dead` linkage to an untrustworthy custodian (see
[06](06-risk-register.md) R13). The model supports an informed choice rather than
blind submission: brokers carry an `optOutExposesLinkage` / `requiresId` flag in
the content layer ([05](05-content-sourcing.md)), and a finding's
`status: "wont_fix"` is a **legitimate, first-class outcome** — sometimes the
safest remediation is to leave a low-reach listing alone. The UI must present
"leave it" as a real option, not a failure state.
