# 02 — Feature Breakdown (MoSCoW)

Prioritization across both phases. **Must** = required for a credible, safe v1.
**Should** = high value, fast-follow (v1.1). **Could** = later. **Won't (yet)**
= explicitly out, with reason.

> **Two binding principles** (see [09](09-removal-feasibility.md)) cut across
> every row below: **(1) we do ~95% of the work, the user presses send** (all
> remediation prepared in-memory, no PII on a server); **(2) no dead-end
> findings** — every queue item carries an action, immutable exposures become a
> "monitor" footnote, never a task.

## Cross-cutting: Safety & platform shell

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | No analytics / trackers / phone-home scripts | Enforced via CSP + a dependency audit; a build check that fails on known tracker packages |
| **Must** | All state client-side (`localStorage`/`IndexedDB`) | See [04](04-data-model.md) |
| **Must** | **Panic-delete** (one obvious control, instant full wipe) | Wipes storage + in-memory state; visible on every screen |
| **Must** | **Ephemeral / session-only mode** | Nothing persisted; clear banner; default-suggested on shared devices |
| **Must** | Shared/monitored-device warning + safety intro | Shown before first use; dismissible, re-findable |
| **Must** | WCAG 2.1 AA, full keyboard nav, screen-reader support | Gate every release on axe + manual SR pass |
| **Must** | Calm, trauma-informed copy; optional content warnings | No urgency, no fear-mongering, no streaks/badges |
| **Must** | **No dead-end findings (attached-action rule)** | Every finding carries a prepared action; immutable exposures demoted to a "monitor" footnote ([09](09-removal-feasibility.md)) |
| **Must** | **Passphrase-encrypted export by default** | Backup holds the deadname; plaintext in a cloud-synced Downloads folder is a honeypot ([06](06-risk-register.md) R14). Plaintext only as an explicit opt-out |
| **Should** | Export / import local backup | Round-trips full state; documented format; encrypted by default |
| **Could** | PWA / offline app shell | Reconcile with data-freshness ([03](03-architecture.md)) |
| **Could** | Self-host one-click guide / Docker | Supports the "runnable offline" goal |
| **Won't (yet)** | **On-device browser-extension automation** | The "on your behalf" upgrade with no custody; large, brittle — roadmap **M6** ([09](09-removal-feasibility.md)) |
| **Won't (yet)** | Server-side / authorized-agent auto-submission | Requires PII custody — the honeypot we refuse |
| **Won't (yet)** | Accounts, login, cloud sync | Violates non-negotiables |

## Phase 1 — Discover

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Guided discovery checklist (brokers, search engines, platforms) | Resumable; current name **and deadname** |
| **Must** | **Deadname-aware search prompts** | Deadname + city, deadname + employer, image search, name-history checks |
| **Must** | Local **findings log** (what / where / priority / notes) | Feeds Phase 2 remediation queue |
| **Should** | Per-broker "is my data here?" deep links | One click to each broker's own search page |
| **Should** | Search-engine strategy templates (copyable queries) | Pre-built dorks for name/deadname |
| **Could** | Reverse-image-search helper | **Links out only** — no upload through us; verify each target tool doesn't force an upload to *somewhere*, and warn if so |
| **Could** | Progress overview / "exposure map" summary | Calm, non-gamified |

> **Dual-use caution on Phase 1:** a polished "how a hostile actor finds your
> deadname/city/employer" guide is also a doxxing recipe when pointed at a third
> party. This is a consciously accepted, mitigated risk — see
> [06](06-risk-register.md) R15. Framing and what we choose *not* to spell out
> are a design constraint on this whole phase.

## Phase 2 — Pillar 1: Opt-out generation

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Per-broker opt-out content generator | Copyable template + `mailto:` + printable letter + web-form step list — **all prepared in-memory; user presses send** |
| **Must** | **California DROP — hero removal feature** | State-operated single-request deletion to *all* registered brokers (consumer access Jan 2026; deletion mandatory Aug 1 2026); gated on the user's **state**; we hold nothing. The closest thing to one-button removal ([09](09-removal-feasibility.md)) |
| **Must** | **Opt-out-paradox flag per broker** | Whether opting out *itself* forces exposing the current↔deadname linkage or ID to an untrustworthy custodian; explicit "sometimes the right move is to leave it" path ([06](06-risk-register.md) R13) |
| **Must** | CCPA/CPRA + authorized-agent framing (informational) | With a clear "not legal advice" disclaimer |
| **Must** | **State-aware rights surfacing** | Rights are sub-national; show what the user's *state* actually grants rather than implying universal CCPA-style rights ([03](03-architecture.md), [04](04-data-model.md)) |
| **Should** | Handling for brokers that demand ID | Guidance on minimizing what you send; redaction tips |
| **Should** | Remediation tracker (sent / confirmed / re-check date) | Tied to findings log; re-surfaces brokers that re-list |
| **Should** | Authorized-agent **packet** generator | Signed authorization + batched requests so the user (or a trusted person) can act as agent — friction down, **custody stays with the user** ([09](09-removal-feasibility.md)) |
| **Could** | Other state-law variants (the US patchwork) | Per-state notes where they add rights; backfills the state-aware model |
| **Won't (yet)** | Server-side / authorized-agent **auto**-submission | Requires PII custody — the honeypot we refuse |

## Phase 2 — Pillar 2: Per-platform hardening & deadname removal

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Click-by-click hardening guides for major platforms | Google, Meta/FB/IG, X, LinkedIn, TikTok, Reddit |
| **Must** | **Deadname / name-removal flows per platform** | The differentiator; incl. Google "Results about you" |
| **Must** | Escalation paths when a platform resists | Appeals, legal-name-change documentation tips, regulator routes |
| **Should** | "Last updated / verify" date per guide | Combats staleness ([05](05-content-sourcing.md)) |
| **Could** | Platform difficulty ratings (à la Just Delete Me) | Optional ingested signal |

## Phase 2 — Pillar 3: Breach checks

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | **Password** breach check (HIBP Pwned Passwords, client-side k-anonymity) | No key, no proxy, no rate limit |
| **Must** | **Every breach hit carries an action** | Breaches are irreversible, so the finding is never a dead-end: "rotate this password → link; check reuse." Detection without an action would violate the no-dead-end rule ([09](09-removal-feasibility.md)) |
| **Should** | **Email** breach check via stateless proxy (k-anonymity mode) | v1.1; proxy never sees full email/hash; degrades to HIBP deep-link if proxy absent |
| **Could** | Guidance/playbook per breach type | What to rotate, where to act |

## Phase 2 — Pillar 4: Deadname-specific removals (consolidated)

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Consolidated deadname-removal playbook across search, platforms, records | Cross-links all pillars; ordered by impact |
| **Must** | **Legal name-change / court-record flow** | Often the *largest, most permanent* deadname source (public petitions, publication, indexed orders); incl. **sealed/confidential petition** routes where a state offers them. Was under-weighted — now first-class |
| **Must** | **Archive / cache removal actions** | Wayback, Google cache, search results get their *own* removal-request paths so "permanent" exposures still carry an action ([09](09-removal-feasibility.md)) |
| **Should** | Records-class guidance (school, licensing boards, bylines) | Authored content; US first |
| **Could** | Letter templates for records custodians | Like opt-out gen, but for institutions |

## Internationalization & jurisdiction

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | i18n scaffolding (locale routing + message catalogs) | English complete in v1 |
| **Must** | **Jurisdiction-aware content loading** (locale ≠ jurisdiction) | `(locale) × (jurisdiction)` matrix from day one |
| **Should** | Complete `es-US` (US Spanish) | Same US law/brokers, translated — v1.1 |
| **Could** | `es-CO` Colombia jurisdiction (Ley 1581 / SIC + CO brokers) | New legal + broker datasets — M5 |
| **Won't (yet)** | Broader LatAm beyond Colombia | Each country = its own legal + broker dataset; scope per request |
