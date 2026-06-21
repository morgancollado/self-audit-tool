# 07 — Roadmap (Solo-Dev Milestones)

Sized for one developer fluent in Next.js. Each milestone is independently
shippable and leaves the app in a safe, usable state. Estimates are rough
relative sizing, not commitments.

## M0 — Skeleton & safety shell  *(small)*
Foundations that everything else depends on, and the non-negotiables that must
exist before any user touches it.
- **Community co-design first:** validate the threat model and tone *with* trans
  users (ideally including the workshop lineage we credit) before building. For a
  trauma-informed tool this is M0, not an afterthought.
- New repo; Next.js **static export**; deploy on **Vercel** (analytics/
  speed-insights OFF and CI-blocklisted); CI (lint, typecheck, axe, **no-tracker
  audit**); strict CSP; MIT/Apache for code.
- Storage adapter with **persistent / ephemeral** modes; `storage.persist()`
  + honest durability note (R18).
- **Panic-delete** (with honestly-scoped copy — it can't wipe browser history /
  exported files) + ephemeral toggle + first-run **safety/shared-device intro**.
- **Hierarchical (state-aware) jurisdiction** plumbing + i18n (`next-intl`).
- Content-as-data loader + JSON schema + schema-validation in CI, including the
  **no-dead-end check** (every record has an action or a monitor-only marker).
- **Exit criteria:** an empty-but-safe app you could hand to a user without
  risk; no analytics anywhere; panic-delete works; co-design feedback logged.

## M1 — Phase 1: Discover (US)  *(medium)*
The differentiator's first half: find your exposure, deadname-aware.
- Guided, resumable discovery checklist (brokers, search engines, platforms).
- **Deadname-aware search prompts** + copyable query templates.
- **Findings log** (with first-class `exposesDeadname`), priorities, resume.
- US broker dataset v1 (transformed from BADBOL, attributed).
- **Exit criteria:** a user can complete a discovery pass and have a populated,
  prioritized findings log — all local.

> **Status: M1 implemented, with post-review safety hardening.** Discovery
> checklist (resumable, deadname-aware), in-memory query generator (no name
> retention), and the findings ledger are live over the M0 store at `/discover`.
> Content: discovery-step + query-template schemas (+ cross-reference
> validation), 4 steps, 5 query templates, 3 BADBOL brokers.
>
> Hardening from the adversarial review: deadname-aware searches are routed to
> **DuckDuckGo in code** (never Google/Bing) with **Copy** as the primary action
> and an explicit warning; **`/discover` is gated behind the shared-device safety
> intro** (no deep-link bypass) and carries the mode toggle; identity inputs
> disable autocomplete/autocorrect/spellcheck and advise a private window on
> shared devices; the ledger free-text cautions against typing the literal
> deadname. A browser smoke test guards the engine routing and the `/discover`
> gate. All gates green; both builds pass.
>
> Known follow-ups (low): the content TS types in `lib/content/types.ts` mirror
> the JSON schemas by hand (drift risk — generate from schema later); the audit
> doc is re-loaded on every ledger mutation; `lib/content/data.ts` imports
> content explicitly (a manifest replaces it as the dataset grows). Next:
> M2 remediation.

## M2 — Phase 2: Opt-out generation + platform hardening (US)  *(large)*
The remediation core; the bulk of the value. Everything here is **prepared
in-memory; the user presses send** (95% rule), and **every finding carries an
action** (no dead-ends).
- Per-broker opt-out generator: text / `mailto:` / printable letter / web-form
  steps; `requiresId` + **opt-out-paradox (`optOutExposesLinkage`)** handling
  with a first-class "leave it" outcome.
- **California DROP as the hero removal feature**, gated on the user's state;
  CCPA/CPRA + authorized-agent **packet** generation with disclaimers.
- **State-aware rights surfacing** (don't imply CCPA rights to non-CA users).
- Platform hardening + **deadname-removal flows** (Google, Meta/IG, X,
  LinkedIn, TikTok, Reddit) + escalation paths.
- **Legal name-change / court-record flow** (incl. sealed-petition routes) +
  **archive/cache removal** actions. **Research + flow scaffolding start now**
  (don't wait on review to build); **general release of the content is gated on
  legal review** and ships behind a "verify locally" banner until reviewed
  ([08](08-open-questions.md) Q11, R4/R11).
- Consolidated **deadname-removal playbook** cross-linking the above.
- Remediation tracker (sent/confirmed/re-check; re-surfaces re-listings).
- **Encrypted-by-default export/import** backup.
- **Exit criteria:** a complete US Discover → Remediate loop, fully static, with
  no dead-end findings anywhere. **This is the credible public v1.**

> **Status: M2 in progress — opt-out generation core landed.** The per-broker
> opt-out generator is live at `/remediate` (gated behind the safety intro, same
> as `/discover`). It prepares each request **in-memory** from transient identity
> and the user presses send (the 95% rule, enforced in code: there is no path
> that transmits). Formats: copyable text + printable letter always; `mailto:`
> when the broker accepts email. The **opt-out paradox (R13)** is first-class —
> including the former name is **opt-in per broker, defaulted OFF** wherever the
> opt-out itself discloses the linkage, with the broker's "leave it" guidance
> surfaced as a real outcome; `requiresId` brokers carry a minimize-disclosure
> warning. A **remediation tracker** (todo/sent/confirmed/blocked + re-check date)
> records what was sent, all local. Content: `template` schema wired with one
> generic `optout-deletion-generic` template; validation now enforces
> broker→template cross-refs and template placeholder integrity. The browser
> smoke test guards the `/remediate` safety gate and asserts no prepared request
> leaks the former name by default. All gates green; both builds pass.
>
> **Update — state-aware rights + California DROP landed.** `/remediate` now opens
> with a state selector that drives rights surfacing through a pure, region-gated
> selector (`lib/remediate/rights.ts`): region-specific rights surface ONLY to an
> exact region match, never cross-country, and never invented — a Texas user is
> never shown CCPA framing. **California DROP is the hero**, gated on CA and
> surfaced as a distinct callout (the state runs it; we hold nothing). Authored
> law content for the v1 priority subset (CA + the national voluntary-opt-out
> baseline, CO, CT, VA, TX), each carrying the required not-legal-advice
> disclaimer and a standing **not-yet-reviewed / verify-locally** banner (R4/R11);
> states without authored guidance get an honest "no verified guidance yet" note
> plus the universal opt-out (no dead-end). `setJurisdiction` persists the state
> (and syncs an existing audit doc) without force-creating storage. The smoke test
> now asserts CA→DROP and that a non-CA user never sees CCPA.
>
> **Update — platform hardening + deadname-removal flows landed.** A new
> `/harden` route (gated behind the safety intro, like `/discover` and
> `/remediate`) carries content-driven, click-by-click guides for Google,
> Instagram/Meta, X, LinkedIn, TikTok, and Reddit. Each leads with **former-name
> removal**, then account hardening; actions feed the shared remediation tracker
> (pillars `deadname` / `platform`). The **no-dead-end rule** is enforced in
> content validation: a platform's deadname-removal block must carry steps even
> when the platform can't change the thing directly — Reddit (usernames can't be
> changed) offers edit-before-delete + reporting rather than a bare "can't." The
> smoke test now asserts the `/harden` gate, that all guides render, and that
> Reddit still offers steps. Guides are jurisdiction-agnostic; platform UIs drift,
> so each carries `lastVerified` for the staleness surface.
>
> Remaining M2 (subsequent slices): **legal name-change / court-record flow**
> (research + scaffolding, gated on legal review) + archive/cache removal;
> consolidated **deadname-removal playbook** cross-linking the pillars;
> **encrypted-by-default export/import**; linking findings directly to their
> prepared remediation in the ledger; authoring the remaining states toward full
> coverage.

## M3 — Breach checks (privacy-route default)  *(small–medium)*
- Client-side **password** k-anonymity check (no proxy).
- Email check: **deep-link is the default** (no project infra in the path).
  Self-hosted **stateless proxy** (Cloudflare Worker) as the integrated opt-in.
  **No project-operated shared proxy in v1** (deferred pending an independent
  OHTTP relay partner — Q2).
- Every breach hit carries a **rotate action** (no dead-ends).
- **Exit criteria:** breach checks work; default path touches no project
  infrastructure; app fully functional with every proxy turned off. → **v1.1**

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

## M6 — On-device browser-extension automation  *(large, post-v1, gated)*
The "on your behalf" upgrade that preserves the no-custody guarantee: an
extension fills forms and drives opt-out flows **as the user, in their own
session, with all PII on-device — no server ever sees it** (see
[09](09-removal-feasibility.md), Rung 3).
- Shares the same content-as-data (broker/platform JSON) as the static app, so
  flows are maintained once.
- Falls back to a Rung-1 prepared action where CAPTCHAs / email-verification
  loops block automation.
- **Exit criteria:** a user completes real broker opt-outs with the extension
  acting locally; verified that no PII leaves the device; static app unchanged
  and still the primary product.

## Cross-cutting track — PWA / offline  *(medium, anytime after M2)*
- Service worker caching app shell + bundled content; optional network-first
  CDN refresh; visible "content version" indicator.
- A genuine privacy feature (run without anyone logging the visit); defer until
  core flows are stable to avoid update-UX complexity early.

## Suggested sequence

```
M0 → M1 → M2  (public v1)
        → M3  (v1.1: breach checks, privacy-route default)
        → M4  (es-US)
        → M5  (Colombia, gated on review)
        → M6  (browser-extension automation, gated, post-v1)
   PWA/offline slots in any time after M2
```

## Ongoing (not a milestone)
- Monthly content spot-checks + community PR merges; quarterly BADBOL sync and
  law review (see [05](05-content-sourcing.md)).
- Accessibility regression checks every release.
- **Continuity / bus-factor (R17):** actively recruit co-maintainers or an org
  home; if maintenance lapses, show an honest "content may be stale" banner
  rather than letting a safety tool rot silently.
- **US state coverage build-out (Q9):** author remaining states toward full
  coverage (all 50 + DC) after the v1 priority subset — data authoring against
  the existing `country`+`region` model, prioritized by population and by
  strength of rights; thin-rights states get honest "limited rights here"
  content rather than silence.
