# 08 — Open Questions for the Requester

Decisions or assumptions that should be confirmed before/early in build.
Resolved-this-session items are noted so the record is complete.

## Resolved this session
- **Repo:** the tool gets its **own dedicated repo**. (Automated creation was
  blocked by the integration's permissions, so scope docs landed in
  `morgancollado/morgan-collado` under `/scope/` for now — extract later.)
- **Breach check:** **stateless serverless proxy** for email checks; password
  check stays client-side.
- **Proxy operation (decided — privacy route):** the **default email path is the
  deep-link**, which routes the user through **no project infrastructure**. The
  **self-hosted proxy** is the integrated opt-in. The **project's shared
  OHTTP-fronted proxy is dropped for v1** (revisit only with an independent relay
  partner). We reversed the earlier "shared proxy as default" call because
  defaulting a high-risk population into project-operated infrastructure
  contradicts the safety premise (see [03](03-architecture.md) Decision 2,
  [06](06-risk-register.md) R2/R16). See Q2 below.
- **i18n/jurisdiction:** **US *and* Colombia** are in scope; language is
  decoupled from jurisdiction (`es-US` ≠ `es-CO`).

## Still open

1. **Repo name & visibility. — Name DECIDED: Errata.** Product name is
   **Errata** (rationale + brand in [11](11-brand.md)); proposed repo slug
   **`errata`**. Two sub-items remain: **(a)** confirm domain/trademark/app-store
   availability for "errata" — a common word, so expect collisions; fall back to
   a qualified domain (`errata.app` / `errata.tools` / `geterrata.*`) if needed;
   **(b)** confirm **public** from day one (recommended — open-source/
   self-hostable is a non-negotiable) vs. private until M2.

2. **The HIBP proxy — DECIDED: privacy route, shared OHTTP rung dropped for v1.**
   The **deep-link is the default** (no project infra in the path); the
   **self-hosted proxy** is the integrated opt-in. The **project's shared OHTTP
   proxy is NOT shipped in v1** — we avoid standing up project-operated
   infrastructure for a high-risk population, and OHTTP's guarantee would anyway
   require an independent relay operator distinct from the gateway (unmet). It
   may be revisited only if a credible **independent relay partner** appears.
   BYO-key-direct-from-browser remains **not viable** (HIBP CORS + `User-Agent`,
   verified). See [03](03-architecture.md) Decision 2 and R2/R16 in
   [06](06-risk-register.md).

3. **Colombia scope depth.** Colombia-only, or is broader LatAm expected later?
   And **do you have access to local legal review** for the CO content (gates
   M5 per Risk R11)? If not, who reviews it?

4. **Hosting choice. — DECIDED: Vercel.** Chosen for familiarity and ship speed.
   Hard guardrails come with it: **(a)** `@vercel/analytics` and
   `@vercel/speed-insights` stay **off and CI-blocklisted by name** — they're the
   exact phone-home packages we left the portfolio repo to avoid; **(b)** keep
   the **static export** so the app stays host-agnostic/self-hostable (Vercel is
   the deploy target, not a lock-in); **(c)** Vercel's platform request/edge logs
   (incl. IP) are the R9 residual — minimize retention, add no first-party
   logging, lean on offline/PWA. The optional **self-hosted** breach proxy can be
   a Vercel Edge Function. See [03](03-architecture.md) Hosting and
   [06](06-risk-register.md) R6/R9.

5. **Commercial-alternative links. — DECIDED: yes, tasteful.** Honestly link to
   paid services (DeleteMe / Optery) as the "I'd rather pay someone" path.
   **Hard constraints to keep it on-brand:** **no affiliate links**, no ranking/
   preferencing, no urgency, presented as a calm aside (not a push), clearly
   labeled as third parties we don't control, and paired with the honest note
   that they require giving the provider your data (the custody tradeoff Errata
   refuses — see [09](09-removal-feasibility.md)). Placement: an optional
   "other ways to do this" sidebar near opt-out, never interrupting the free
   flow. Folded into [00](00-prior-art.md) and [02](02-features-moscow.md).

6. **Encrypted export. — DECIDED (earlier): yes, encrypted by default.** See
   R14 / [04](04-data-model.md). Plaintext only as a warned opt-out.

7. **Name retention default. — DECIDED: off, firmly.** Storing the user's
   name/deadname is **off by default**; pre-filled templates are an explicit
   opt-in convenience only. This is the core honeypot mitigation (R1) and is now
   a settled constraint, not a preference to revisit. See [04](04-data-model.md).

8. **Donor/funding model, if any.** The tool is free/DIY by design. If any
   sustaining model is ever wanted, note that BADBOL's **NonCommercial** data
   license would constrain a paid offering built on that data.

## New (from the stress-test pass) — all DECIDED this round

9. **State-aware jurisdiction depth. — DECIDED: full US coverage.** Author **all
   US states** (50 + DC), not a coarse "US." Sequencing: **CA first** (DROP),
   then the comprehensive-privacy-law states (CO, VA, CT, plus high-population
   TX, FL, NY), then the remaining states as fast-follow content work — this is
   *data* authoring against the existing `country`+`region` model, not a
   rewrite, so v1 can ship a priority subset and expand without re-architecting.
   Standing commitment: **never imply CCPA-style rights to a user whose state
   lacks them** (honest "limited rights here" content for thin-rights states).

10. **Browser-extension appetite (M6). — DECIDED: yes.** Post-v1 track, targeting
    **Chromium + Firefox**, keeping all PII on-device (no custody).

11. **Legal review for the name-change / court-record flow. — DECIDED: yes,
    start now.** Begin the research and **stand up the flow now** (don't wait on
    review to start building); **general release of the content is gated on
    legal review** (name-change-experienced legal-aid org / trans-law clinic),
    shipped behind a "verify locally" banner until reviewed. Same gate as
    R4/R11.

12. **Dual-use stance (R15). — DECIDED: accepted.** Mitigation stands:
    self-audit framing, no "look someone else up" affordance, declining to spell
    out the most operational targeting steps. Documented residual.

13. **Encrypted export default (R14). — DECIDED: yes.** Backups are
    **passphrase-encrypted by default**; plaintext only as a warned opt-out.

## Items tagged `[VERIFY]` during research
None outstanding — the load-bearing facts were verified this session:
- HIBP: Pwned Passwords range is keyless/k-anonymous; **email search (incl.
  k-anonymity mode) requires an API key** → justifies the proxy.
- HIBP: **CORS is allowed only for non-authenticated APIs**; key'd endpoints
  must not be called client-side and require a `User-Agent` browsers can't set
  cross-origin → a proxy is unavoidable for integrated email checks, even with a
  user's own key (verified against HIBP API docs).
- **BADBOL license = CC BY-NC-SA 4.0.**
- **California DROP** live 2026 (broker compliance mandatory Aug 1 2026).
- Workshop origin (Imani Thompson, *Cache Me Outside* / *"404: Deadname Not
  Found"*) verified via 404 Media.
- Colombia: Ley 1581 de 2012 + SIC complaint path (consulta/reclamo, 10
  business days, exhaust-then-escalate) confirmed at a summary level; **detailed
  CO procedures still need local legal review before release.**
