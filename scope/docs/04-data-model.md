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
  jurisdiction: "us" | "co";
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

## Export / import

- **Export:** serializes `AuditState` to a single JSON file
  (`self-audit-backup-YYYY-MM-DD.json`) the user downloads. Includes
  `schemaVersion`. Contains whatever the user chose to save (so if
  `rememberNames` is off, names aren't in the file).
- **Import:** validates `schemaVersion` (run migrations if older), then either
  **replaces** or **merges** (offer the choice; default replace for
  predictability). Reject malformed files with a calm error.
- **No encryption in v1**, but the export screen warns that the backup is
  plaintext and should be stored somewhere the user controls. (Optional
  passphrase-encrypted export is a **Could** — see [02](02-features-moscow.md).)

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
