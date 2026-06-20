# 01 — MVP Definition

## One-line scope

> **v1 = Discover (US) + opt-out request generation (US) + per-platform
> hardening & deadname removal (US) + client-side password breach check, fully
> static, English-first with i18n scaffolding. Everything else is excluded
> from v1.**

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
  printable letter + step list for web forms). Surface CCPA/CPRA and
  authorized-agent framing and the **California DROP** path without giving
  legal advice.
- **Phase 2 — Platform hardening & deadname removal (US):** guided,
  click-by-click hardening for the major platforms, **including name/deadname
  removal flows** (Google "Results about you", X, Meta/Instagram, LinkedIn,
  TikTok, Reddit), with escalation paths when a platform resists.
- **Phase 2 — Password breach check:** client-side HIBP Pwned Passwords
  k-anonymity check.
- **Progress:** resumable across both phases; **export/import** local backup
  (JSON).
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
| **Automated opt-out submission** | Impossible without a backend; off-brand | **never (by design)** |
| **Accounts / sync / cloud backup** | Violates no-server, no-account rules | **never (by design)** |
| **Broker dataset auto-refresh from a live source** | Start with versioned-in-repo + redeploy | revisit in [05](05-content-sourcing.md) |

## Definition of done for v1

- A user can complete a full Discover → Remediate pass for the US, generate
  opt-out requests, harden platforms incl. deadname removal, run a password
  breach check, and resume later — **with no data leaving their browser** and a
  working panic-delete and ephemeral mode.
- Lighthouse/axe accessibility passes at AA on every screen.
- Static build deploys to a generic static host with no environment secrets.
