# 02 — Feature Breakdown (MoSCoW)

Prioritization across both phases. **Must** = required for a credible, safe v1.
**Should** = high value, fast-follow (v1.1). **Could** = later. **Won't (yet)**
= explicitly out, with reason.

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
| **Should** | Export / import local backup (JSON) | Round-trips full state; documented format |
| **Could** | PWA / offline app shell | Reconcile with data-freshness ([03](03-architecture.md)) |
| **Could** | Self-host one-click guide / Docker | Supports the "runnable offline" goal |
| **Won't (yet)** | Accounts, login, cloud sync | Violates non-negotiables |

## Phase 1 — Discover

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Guided discovery checklist (brokers, search engines, platforms) | Resumable; current name **and deadname** |
| **Must** | **Deadname-aware search prompts** | Deadname + city, deadname + employer, image search, name-history checks |
| **Must** | Local **findings log** (what / where / priority / notes) | Feeds Phase 2 remediation queue |
| **Should** | Per-broker "is my data here?" deep links | One click to each broker's own search page |
| **Should** | Search-engine strategy templates (copyable queries) | Pre-built dorks for name/deadname |
| **Could** | Reverse-image-search helper | Links to image-search tools; no upload through us |
| **Could** | Progress overview / "exposure map" summary | Calm, non-gamified |

## Phase 2 — Pillar 1: Opt-out generation

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Per-broker opt-out content generator | Copyable template + `mailto:` + printable letter + web-form step list |
| **Must** | CCPA/CPRA + authorized-agent framing (informational) | With a clear "not legal advice" disclaimer |
| **Must** | **California DROP** path surfaced | Single-request deletion to registered brokers (live 2026) |
| **Should** | Handling for brokers that demand ID | Guidance on minimizing what you send; redaction tips |
| **Should** | Remediation tracker (sent / confirmed / re-check date) | Tied to findings log |
| **Could** | Other state-law variants (the US patchwork) | Beyond CA: per-state notes where they add rights |
| **Won't (yet)** | Auto-submission of requests | No backend; off-brand by design |

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
| **Should** | **Email** breach check via stateless proxy (k-anonymity mode) | v1.1; proxy never sees full email/hash; degrades to HIBP deep-link if proxy absent |
| **Could** | Guidance/playbook per breach type | What to rotate, where to act |

## Phase 2 — Pillar 4: Deadname-specific removals (consolidated)

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | Consolidated deadname-removal playbook across search, platforms, records | Cross-links pillars 1–2; ordered by impact |
| **Should** | Records-class guidance (school, licensing boards, court, bylines) | Authored content; US first |
| **Could** | Letter templates for records custodians | Like opt-out gen, but for institutions |

## Internationalization & jurisdiction

| Priority | Feature | Notes |
|----------|---------|-------|
| **Must** | i18n scaffolding (locale routing + message catalogs) | English complete in v1 |
| **Must** | **Jurisdiction-aware content loading** (locale ≠ jurisdiction) | `(locale) × (jurisdiction)` matrix from day one |
| **Should** | Complete `es-US` (US Spanish) | Same US law/brokers, translated — v1.1 |
| **Could** | `es-CO` Colombia jurisdiction (Ley 1581 / SIC + CO brokers) | New legal + broker datasets — M5 |
| **Won't (yet)** | Broader LatAm beyond Colombia | Each country = its own legal + broker dataset; scope per request |
