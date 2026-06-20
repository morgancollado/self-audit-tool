# 01 — MVP Definition

## One-line scope

> **v1 = Discover (US) + opt-out request generation (US) + per-platform
> hardening & deadname removal (US) + legal name-change / court-record flow +
> California DROP routing + client-side password breach check, fully static,
> English-first with i18n scaffolding. Everything is governed by the two product
> principles — *95% of the work / final keystroke is the user's*, and *no
> dead-end findings* — and everything else is excluded from v1.**

## Two principles that bind v1 (from [09](09-removal-feasibility.md))

1. **We do ~95%, the user presses send.** Every remediation is prepared
   in-memory (pre-filled `mailto:` / form text / printable letter); no PII ever
   reaches a server. This is the *maximum* automation possible without custody;
   hands-off removal is out of scope by design, not by laziness.
2. **No dead-end findings.** Every queue item carries an action. Immutable
   exposures become a "monitor — can't remove" footnote with whatever
   harm-reduction applies, never a task. A user must never be handed a list of
   things they can do nothing about.

## The MVP hypothesis (pressure-tested)

The brief's hypothesis was: *MVP = Phase 1 + opt-out generation + platform
hardening, with breach-checks deferred pending the egress decision.* After
research this holds, with two refinements:

1. **The password (k-anonymity) breach check is cheap and fully client-side**
   (no key, no rate limit). It delivers real value with zero architectural
   cost, so it is **in** v1. Only the *email* breach check (which needs the
   proxy) is deferred to **v1.1**.
2. **LatAm/Colombia content is deferred** to a later milestone, but the
   **content model is jurisdiction-aware from v1** so adding `es-CO` later is
   data work, not a rewrite. v1 ships **US jurisdiction only**, English-first,
   with the i18n + jurisdiction *plumbing* present and one pseudo-locale or
   partial `es-US` to prove the pipeline.

This keeps v1 small enough for a solo dev while protecting the two
differentiators (deadname focus, safety architecture) and the two hardest
later expansions (breach email, LatAm).

## v1 INCLUDES

- **Safety shell (must-haves, day one):** no analytics/trackers; all state
  local; **panic-delete**; **ephemeral/session-only mode**; shared-device
  warning; static deploy.
- **Phase 1 — Discover:** guided, resumable checklist for searching data
  brokers, search engines, and platforms for **current name and deadname**;
  optional content warnings before discovery steps; a **local findings log**
  (what, where, priority) that feeds Phase 2.
- **Phase 2 — Opt-out generation (US):** for each broker in the dataset,
  generate ready-to-send opt-out content (copyable templates + `mailto:` +
  printable letter + step list for web forms) — **prepared in-memory; the user
  presses send.** Surface CCPA/CPRA and authorized-agent framing without giving
  legal advice. Each broker also flags whether opting out *itself* requires
  exposing the current↔deadname linkage or ID (the **opt-out paradox**, see
  [06](06-risk-register.md) R13) so the user can make an informed choice.
- **Phase 2 — California DROP routing (hero removal feature for CA residents):**
  surface the state-operated **DROP** single-request deletion (propagates to all
  registered brokers, mandatory Aug 1 2026) prominently, gated on the user's
  **state** — the closest thing to one-button removal, and we hold nothing. See
  [09](09-removal-feasibility.md).
- **Phase 2 — Platform hardening & deadname removal (US):** guided,
  click-by-click hardening for the major platforms, **including name/deadname
  removal flows** (Google "Results about you", X, Meta/Instagram, LinkedIn,
  TikTok, Reddit), with escalation paths when a platform resists.
- **Phase 2 — Legal name-change / court-record flow:** first-class guidance for
  the often *largest and most permanent* deadname source — public name-change
  petitions, publication requirements, and the indexed court order tying
  old↔new name — including **sealed/confidential name-change provisions** for
  at-risk petitioners where a state offers them. (See
  [00](00-prior-art.md) — authored content; informational, not legal advice.)
- **Phase 2 — Password breach check:** client-side HIBP Pwned Passwords
  k-anonymity check.
- **Progress:** resumable across both phases; **export/import** local backup.
  The export is **passphrase-encrypted by default** — the backup contains the
  deadname and would otherwise be a plaintext honeypot in a (often
  cloud-synced) Downloads folder (see [04](04-data-model.md), [06](06-risk-register.md) R14).
- **State-aware US jurisdiction:** the jurisdiction model carries the user's
  **state**, because deletion rights are sub-national (a California resident has
  CCPA/CPRA/DROP; a Texas resident has almost nothing). **Target is full US
  coverage (all 50 + DC)**; v1 ships a priority subset (CA first, then
  CO/VA/CT/TX/FL/NY) and is honest about thin-rights states, with the rest
  filled in as fast-follow *data* work — never implying rights a state doesn't
  grant. See [04](04-data-model.md), [08](08-open-questions.md) Q9.
- **Attached-action queue:** the findings log never shows a bare finding — each
  carries its prepared remediation, sorted by impact; immutable items are
  demoted to a "monitor" footnote (the no-dead-end rule).
- **Accessibility/tone:** WCAG 2.1 AA, keyboard nav, screen-reader friendly,
  calm trauma-informed copy.
- **i18n scaffolding:** routing + message catalogs + jurisdiction-aware content
  loading in place; English complete; at least a partial `es-US` to validate.

## v1 EXCLUDES (deferred, with target milestone)

| Excluded from v1 | Why | Target |
|------------------|-----|--------|
| **Email breach check** (HIBP by email) | Needs the stateless proxy; not purely static | **v1.1** |
| **Spanish content complete (`es-US`)** | Translation + review effort | **v1.1 / M4** |
| **Colombia / LatAm jurisdiction (`es-CO`)** | Requires authoring all-new legal + broker data | **M5** |
| **PWA / offline** | Cross-cutting; reconcile with data freshness first | **post-MVP track** |
| **On-device browser-extension automation** | Real "on your behalf" form-filling with no custody; large build, per-broker brittleness | **M6 (post-v1 track)** |
| **Server-side / authorized-agent auto-submission** | Requires PII custody — the honeypot we refuse | **never (by design)** |
| **Accounts / sync / cloud backup** | Violates no-server, no-account rules | **never (by design)** |
| **Broker dataset auto-refresh from a live source** | Start with versioned-in-repo + redeploy | revisit in [05](05-content-sourcing.md) |

## Definition of done for v1

- A user can complete a full Discover → Remediate pass for the US, generate
  opt-out requests (prepared in-memory, sent by their own keystroke), be routed
  into California DROP if they're a CA resident, get the legal name-change /
  court-record flow, harden platforms incl. deadname removal, run a password
  breach check, and resume later — **with no data leaving their browser** and a
  working panic-delete and ephemeral mode.
- **Every finding shown carries an action or is an honest "monitor" footnote** —
  no dead-ends anywhere in the flow.
- Export is encrypted-by-default; jurisdiction is state-aware.
- Lighthouse/axe accessibility passes at AA on every screen.
- Static build deploys to a generic static host with no environment secrets.
