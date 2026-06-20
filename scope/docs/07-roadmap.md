# 07 — Roadmap (Solo-Dev Milestones)

Sized for one developer fluent in Next.js. Each milestone is independently
shippable and leaves the app in a safe, usable state. Estimates are rough
relative sizing, not commitments.

## M0 — Skeleton & safety shell  *(small)*
Foundations that everything else depends on, and the non-negotiables that must
exist before any user touches it.
- New repo; Next.js static export; CI (lint, typecheck, axe, **no-tracker
  audit**); strict CSP; MIT/Apache for code.
- Storage adapter with **persistent / ephemeral** modes.
- **Panic-delete** + ephemeral toggle + first-run **safety/shared-device
  intro**.
- i18n + jurisdiction plumbing (`next-intl`; jurisdiction as a stored pref).
- Content-as-data loader + JSON schema + schema-validation in CI.
- **Exit criteria:** an empty-but-safe app you could hand to a user without
  risk; no analytics anywhere; panic-delete works.

## M1 — Phase 1: Discover (US)  *(medium)*
The differentiator's first half: find your exposure, deadname-aware.
- Guided, resumable discovery checklist (brokers, search engines, platforms).
- **Deadname-aware search prompts** + copyable query templates.
- **Findings log** (with first-class `exposesDeadname`), priorities, resume.
- US broker dataset v1 (transformed from BADBOL, attributed).
- **Exit criteria:** a user can complete a discovery pass and have a populated,
  prioritized findings log — all local.

## M2 — Phase 2: Opt-out generation + platform hardening (US)  *(large)*
The remediation core; the bulk of the value.
- Per-broker opt-out generator: text / `mailto:` / printable letter / web-form
  steps; `requiresId` handling.
- CCPA/CPRA + authorized-agent + **CA DROP** framing with disclaimers.
- Platform hardening + **deadname-removal flows** (Google, Meta/IG, X,
  LinkedIn, TikTok, Reddit) + escalation paths.
- Consolidated **deadname-removal playbook** cross-linking the above.
- Remediation tracker (sent/confirmed/re-check).
- **Export/import** JSON backup.
- **Exit criteria:** a complete US Discover → Remediate loop, fully static.
  **This is the credible public v1.**

## M3 — Breach checks  *(small–medium)*
- Client-side **password** k-anonymity check (no proxy).
- Stateless **HIBP proxy** (Cloudflare Worker) + email k-anonymity flow with
  **deep-link fallback** when proxy absent.
- **Exit criteria:** both breach checks work; app still fully functional with
  the proxy turned off. → **v1.1**

## M4 — Spanish for US (`es-US`)  *(medium)*
- Complete `es` UI catalog; translate US prose/templates; Spanish content
  warnings + crisis resources.
- **Exit criteria:** a US-based Spanish speaker can do the full loop in Spanish.

## M5 — Colombia jurisdiction (`es-CO` / `en-CO`)  *(large, gated)*
- Author CO broker dataset + Ley 1581/SIC law framing + CO templates
  (habeas data / reclamo).
- **Local expert review before general release** (Risk R11); ship behind a
  region label until reviewed.
- **Exit criteria:** a Colombia user gets jurisdiction-correct guidance,
  reviewed. (Broader LatAm only on explicit request, per country.)

## Cross-cutting track — PWA / offline  *(medium, anytime after M2)*
- Service worker caching app shell + bundled content; optional network-first
  CDN refresh; visible "content version" indicator.
- A genuine privacy feature (run without anyone logging the visit); defer until
  core flows are stable to avoid update-UX complexity early.

## Suggested sequence

```
M0 → M1 → M2  (public v1)
        → M3  (v1.1: breach checks)
        → M4  (es-US)
        → M5  (Colombia, gated on review)
   PWA/offline slots in any time after M2
```

## Ongoing (not a milestone)
- Monthly content spot-checks + community PR merges; quarterly BADBOL sync and
  law review (see [05](05-content-sourcing.md)).
- Accessibility regression checks every release.
