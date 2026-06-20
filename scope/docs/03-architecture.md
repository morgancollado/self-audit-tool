# 03 — Architecture

This document defines the technical shape of the tool and **resolves the six
hard engineering decisions** with rationale and tradeoffs.

## High-level shape

```
┌─────────────────────────────────────────────────────────────┐
│  Static Next.js app (export)  ── deployable anywhere          │
│  • All UI + content rendered client-side                      │
│  • Content-as-data (JSON) bundled at build OR fetched read-only│
│  • All user state in localStorage / IndexedDB                 │
│  • No analytics, no third-party scripts                       │
└───────────────┬─────────────────────────────────────────────┘
                │  (optional, only for email breach check)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Stateless HIBP proxy  ── separate deploy, no storage, no logs│
│  • Holds HIBP API key; forwards k-anonymity prefix only       │
│  • If absent, app degrades to a HIBP deep-link                 │
└─────────────────────────────────────────────────────────────┘
```

The app is the product; the proxy is an optional accessory.

## Next.js project structure

Next.js (App Router) with **static export** (`output: 'export'`). Suggested
layout:

```
/app
  /[locale]                      # next-intl locale segment
    /discover/...                # Phase 1 flow
    /remediate/...               # Phase 2 pillars
    /settings                    # panic-delete, ephemeral toggle, export/import
    layout.tsx
  /api                           # (none in the static app — proxy is separate)
/components                      # UI; presentational, content-agnostic
/lib
  /storage                       # localStorage/IndexedDB adapter + ephemeral mode
  /content                       # loaders that resolve (locale × jurisdiction)
  /breach                        # client-side Pwned Passwords k-anonymity
/content                         # CONTENT-AS-DATA, the single source of truth
  /brokers/us/*.json
  /brokers/co/*.json             # (later)
  /platforms/*.json
  /law/{us,co}/*.json
  /messages/{en,es}.json         # UI strings (i18n)
/proxy                           # the standalone stateless function (separate deploy)
```

**No MUI.** The portfolio uses MUI; this app should use a lighter,
fully-controllable styling approach (CSS Modules or Tailwind) to keep the
bundle small, the CSP tight, and accessibility under direct control. (Decision,
not a hard requirement — but avoid heavy component libs that inject styles or
scripts.)

## Client-side state model

- **Storage adapter** in `/lib/storage` abstracts persistence so the same code
  works in three modes:
  - **Persistent** (default): `IndexedDB` for the findings log + remediation
    tracker (structured, can grow); `localStorage` for small prefs (locale,
    jurisdiction, content-warning prefs).
  - **Ephemeral / session-only**: a memory-backed store; nothing written to
    disk; cleared on tab close.
  - Switching to ephemeral mid-session offers to wipe what's already persisted.
- **Panic-delete** calls a single `wipeAll()` that clears IndexedDB +
  localStorage + in-memory state and reloads to a neutral screen.
- See [04](04-data-model.md) for the exact shapes and export/import.

## Content-as-data schema (the core of maintainability)

All broker/platform/law content lives as **versioned structured data**, never
hardcoded in components. The defining constraint from the multi-jurisdiction
decision: **language ≠ jurisdiction.**

- **Locale** (`en`, `es`) selects UI strings and translated prose.
- **Jurisdiction** selects *which brokers and which legal framework apply.* It is
  **hierarchical, not a flat country code**, because in the US, deletion rights
  are **sub-national**: a California resident has CCPA/CPRA/DROP; a Texas
  resident has almost nothing. Model it as `country` + optional `region`
  (`us` / `us-CA` / `us-TX` … / `co`). Treating "us" as one jurisdiction would
  either over-promise rights to non-CA users or bury the patchwork — and
  retrofitting a sub-jurisdiction axis later is a data-model migration. Build it
  in from day one. **Target: full US coverage (all 50 + DC)**, authored CA-first
  then comprehensive-law/high-population states; v1 ships a priority subset and
  is honest about thin-rights states. Expansion is pure content authoring against
  this model, not a rewrite ([08](08-open-questions.md) Q9).

A user can be `(locale=es, jurisdiction=us-CA)` — a California Spanish speaker —
or `(locale=es, jurisdiction=co)` — Colombia. These are independent axes.
Content loaders in `/lib/content` resolve `(locale × jurisdiction)`, falling
back to a base locale for missing translations and from a region to its country
base for *rights that genuinely apply nationally*, but **never** falling back
across countries (showing US law to a CO user would be wrong/dangerous) and
**never inventing state rights that don't exist** (a `us-TX` user must not see
CCPA framing).

See [05](05-content-sourcing.md) for full schemas and worked examples.

---

## The six hard decisions — resolved

### Decision 1 — Data freshness without a backend
**Recommendation: versioned data file in the repo, updated via redeploy, as the
default; with an *optional* runtime fetch of a read-only JSON from a neutral
CDN/GitHub raw as a later enhancement.**

- **Why:** a solo dev who can edit a JSON file and push is a maintenance story
  that survives. Build-time bundling means the data ships with the app, works
  offline, and adds zero runtime egress. Corrections come as PRs (mirrors how
  BADBOL already works).
- **Optional enhancement:** for users who want the latest without waiting for a
  redeploy, the app can fetch a read-only `content.json` from GitHub raw / a
  neutral CDN. This sends **no user data** (a plain GET of a public file), only
  a slight egress + the user's IP to that CDN. Make it **opt-in** and clearly
  labeled, and always ship a bundled fallback so the app works with the network
  off.
- **Tradeoff:** redeploy-only means data is as fresh as the last deploy; a
  monthly cadence + community PRs is realistic. The runtime fetch trades a tiny
  privacy cost (IP to a CDN) for freshness — hence opt-in, not default.
- **Rejected:** build-time fetch from a live source (makes builds
  non-reproducible and breaks offline builds); a self-run scraper (unsustainable
  for one person).

### Decision 2 — Breach-check egress (the big one)
**Decision (privacy route): password checks stay client-side; email breach checks
use a thin, stateless, log-free serverless proxy isolated from the static app.
The *default* is the privacy-maximizing path — the **deep-link** (no project
infrastructure in the path) — with a **self-hosted proxy** as the integrated
opt-in for those who want it. The project's **shared OHTTP-fronted proxy is NOT
shipped in v1** (revisit only with an independent relay partner). The default is
conservative by design.**

> **Why the default reversed.** The earlier draft made the project-operated
> shared proxy the default for best UX. For a population whose entire premise is
> "the architecture is the safety feature" — and whose adversary may have
> subpoena power (R16) — routing users through *project-operated infrastructure*
> is the wrong instinct, so the shared proxy is dropped for v1 entirely. Users
> who want integrated (in-flow) email results self-host the proxy; everyone else
> gets the deep-link. Nobody is routed through project infrastructure at all.

- **Client-side, always:** Pwned Passwords range API — no key, no rate limit,
  k-anonymity (5-char SHA-1 prefix). Ships in the static app.
- **Email check via proxy:** HIBP email search requires an API key, and even
  the k-anonymity email mode requires a key (verified — it is *not* keyless).
  So:
  - The browser computes `SHA-1(normalized email)` and sends **only the first
    6 hex chars** to the proxy (k-anonymity mode).
  - The proxy attaches the secret `hibp-api-key`, forwards to HIBP, and returns
    the list of hash-suffix matches. **The client does the final match
    locally.**
  - **The proxy never receives the full email or the full hash** — it sees a
    6-char prefix shared by thousands of addresses. This is the key property
    that lets us call it "stateless and safe" honestly.
- **Hard requirements on the proxy** (see [06](06-risk-register.md)):
  no request logging, no storage, no analytics, minimal headers, CORS locked to
  the app origin (UX hygiene, **not** a security boundary — see R2),
  its own rate limiting, deployed separately (e.g., a Cloudflare Worker) so the
  app stays static and self-hostable, and **the app must fully function without
  it** — when the proxy URL is unset, the email check renders as a deep-link to
  haveibeenpwned.com.
- **Why a proxy is unavoidable for *integrated* email (verified against HIBP's
  API docs):** HIBP states *"CORS is only supported for non-authenticated APIs.
  APIs requiring a key should not be hit directly from the client side as it
  exposes the secret."* The email hash-**range** (k-anonymity) endpoint still
  requires the key, so it is authenticated and **also** CORS-blocked; HIBP
  additionally requires a `User-Agent` header browsers cannot set cross-origin.
  **Consequence:** even a user supplying *their own* key cannot call HIBP from
  the browser — integrated email checks require a proxy, period. HIBP itself
  recommends a Cloudflare Worker for exactly this.
- **Honest impact on "no backend":** this *is* a backend. It is the one
  documented exception. It is mitigated by (a) handling only a non-identifying
  prefix, (b) statelessness, (c) physical isolation, (d) optionality. A
  self-hoster who wants zero servers simply omits it.

#### Tiered access model — best UX vs. zero infrastructure

The key constraint is HIBP's, not ours: you **cannot** have *both*
fully-integrated email results *and* zero project-operated infrastructure for an
arbitrary user — something must hold the key, and (per above) it cannot be the
browser. So the only lever is *where the keyed component lives and who is
trusted.* **Decision (privacy route): ship the full ladder but make the
*default* the path that routes the user through no project infrastructure —
the deep-link (rung 2).** The integrated rungs (3, 4) are opt-in, each behind an
honest explanation of what it touches. Rungs ordered from most to least private:

1. **Password check** — client-side Pwned Passwords (keyless, k-anonymous).
   Integrated, zero infrastructure. Always on.
2. **Email default — deep-link** to haveibeenpwned.com. **This is the default
   email path.** Zero project infrastructure; nothing of the user's touches us.
   The cost is a context switch, no capture of the result into the findings log,
   and the user's *full* email reaching HIBP + its CDN (disclosed at the link).
3. **Opt-in: self-host tier — point the app at your own proxy URL.**
   Fully-integrated, in-flow email results that feed the remediation tracker,
   with the (small) attack surface on the user's own infra — operator == user,
   collapsing the operator-trust residual (see R2). For self-hosters who want the
   integrated flow on zero third-party trust.
4. **Deferred (NOT in v1): the project's shared, OHTTP-fronted proxy.** Would
   give integrated results with no self-hosting, but **we do not ship it in v1.**
   Standing up project-operated infrastructure for a high-risk population cuts
   against the safety premise, and the OHTTP guarantee would require an
   **independent relay operator distinct from the gateway** — privacy holds
   *only if relay and gateway are separate, non-colluding parties*; if the
   project runs both, it degrades to "trust me not to log." Revisit **only** if a
   credible independent relay partner appears. See [08](08-open-questions.md) Q2.

- **Rejected:** embedding the key client-side (leaks it); keyless email k-anon
  (doesn't exist — even range mode needs the key); **calling HIBP directly from
  the browser with the user's own key (CORS-blocked + `User-Agent` restriction,
  verified) — so BYO-key still needs a proxy.**

### Decision 3 — localStorage UX & safety
**Recommendation:** three storage modes (persistent / ephemeral / wiped),
always-visible panic-delete, JSON export/import for backups, and explicit
shared-device handling.

- **Resumable progress:** persistent mode stores the findings log + remediation
  tracker in IndexedDB; the user returns to where they left off.
- **Export/import:** a single JSON file the user controls (their backup, their
  device, their choice). No cloud.
- **Panic-delete:** one obvious, always-reachable control; instant full wipe +
  reload.
- **Ephemeral mode:** persists nothing; recommended (with a prominent banner)
  for shared/monitored devices; offered up-front in the safety intro.
- **Warnings:** first-run safety screen explains shared-device risk, browser
  history, and that even local data can be seen by someone with device access.

### Decision 4 — Opt-out generation mechanics
**Recommendation:** generate **multiple output formats** per broker and let the
user pick; never auto-submit.

- **Formats:** copyable plain-text template (most portable), `mailto:` link
  (pre-filled where the broker accepts email), printable letter (PDF/print
  stylesheet) for mail-only brokers, and an ordered step list for web-form
  brokers.
- **ID-demanding brokers:** explicit guidance to minimize disclosure (redact
  all but what's strictly required, cover document numbers, never send more than
  asked); flag these brokers in the data.
- **State-law / authorized-agent:** surface CCPA/CPRA rights, the
  authorized-agent option, and **California DROP** (single-request deletion to
  registered brokers, live 2026) as *informational options* with a standing
  **"this is information, not legal advice"** disclaimer. The app states rights;
  it does not advise on a user's specific situation.

### Decision 5 — i18n scope
**Recommendation:** treat **locale and jurisdiction as separate axes** (see
above). `es-US` = US jurisdiction, Spanish UI + prose. **Colombia (`es-CO`) is
in scope per the requester** and requires its own legal + broker datasets
(authored from primary sources — no existing dataset). Broader LatAm is *not*
in scope unless requested per-country, because each country is a distinct legal
+ broker dataset.

- **Library:** `next-intl` for UI strings + locale routing; jurisdiction is a
  separate stored preference that drives content loading.
- **Tradeoff:** the matrix multiplies content-authoring work; mitigated by the
  schema and by milestoning (US complete first, then `es-US`, then `es-CO`).

### Decision 6 — Offline / PWA vs data freshness
**Recommendation:** PWA is a **post-MVP** feature; when added, **cache the app
shell + the bundled data, and treat the optional CDN refresh as
network-first-with-cache-fallback.**

- The bundled (Decision 1) data is what makes offline coherent: the app and its
  data are one immutable, versioned unit, cached by the service worker. There's
  no freshness paradox because offline simply means "as fresh as the installed
  version," with a visible "content version / last updated" indicator.
- The optional CDN refresh, when online, updates a cached copy; offline falls
  back to the bundled/last-cached data.
- **Tradeoff:** a service worker adds complexity and a new update-prompt UX;
  defer until the core flows are stable. PWA is genuinely a *privacy* feature
  (run it without anyone logging the visit), so it's worth doing — just not in
  v1.

---

## Future architecture — the browser extension (M6)

The static app's automation ceiling is **Rung 1** of
[09](09-removal-feasibility.md): prepared-in-memory actions the user sends with
one keystroke. The next rung *without breaking the no-custody guarantee* is a
**client-side browser extension**, because an extension can act — fill forms,
drive opt-out flows, click through — **as the user, in the user's own session,
with all PII staying on the user's machine. No server ever sees it** (same trust
model as a password manager).

- **Why not a server doing this:** a server filling forms must hold the PII =
  the honeypot. The extension keeps custody on-device, which is the whole point.
- **Honest limits:** per-broker brittleness; CAPTCHAs and email-verification
  loops stop full automation, at which point the extension hands the task back
  to the user as a Rung-1 prepared action.
- **Boundary:** the extension shares the same content-as-data (broker/platform
  JSON) as the static app, so flows are maintained once. It is a *separate
  deliverable* gated behind the static MVP — the static site remains the
  product; the extension is the automation upgrade.

## Generation is in-memory by default (the 95% rule, enforced in code)

All opt-out artifacts (`mailto:`, form text, letters) are rendered from the
**transient** identity input at generation time and are **not written back**
unless the user opted into name retention ([04](04-data-model.md)). The final
send is always a user action (clicking a `mailto:`, pasting into a form,
printing a letter) — there is no code path where identity leaves the device
automatically. This is the architectural expression of "we do ~95%, the user
presses send."

## Hosting

- **Static app:** any static host — **GitHub Pages, Cloudflare Pages, Netlify,
  or Vercel.** No secrets required. Recommend **Cloudflare Pages** (fast,
  generous free tier, and Pages Functions/Workers can host the proxy nearby if
  desired). The app must remain host-agnostic.
- **Proxy (optional):** a **Cloudflare Worker** (or any serverless function),
  deployed separately with the HIBP key as a secret. Its URL is injected into
  the app at build time as a public config value; absent → deep-link fallback.

## Build / deploy / maintenance pipeline

- **CI:** lint + typecheck + **axe accessibility check** + a **"no tracker"
  dependency/CSP audit** that fails the build if a known phone-home dependency
  or script appears. Optionally validate every content JSON against its schema.
- **Deploy:** push to `main` → static build → static host. Reproducible builds
  (no network at build time by default).
- **Content updates:** edit `/content/**.json` → PR → merge → redeploy. The
  "last updated / verify" date per record is part of the data (Decision 1 + 6).
- **Proxy deploy:** independent; changes rarely.
