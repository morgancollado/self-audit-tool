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
- **Jurisdiction** (`us`, `co`) selects *which brokers and which legal
  framework apply.*

A user can be `(locale=es, jurisdiction=us)` — a US-based Spanish speaker — or
`(locale=es, jurisdiction=co)` — Colombia. These are independent axes. Content
loaders in `/lib/content` resolve `(locale × jurisdiction)`, falling back to a
base locale for missing translations but **never** falling back across
jurisdictions (showing US law to a CO user would be wrong/dangerous).

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
**Recommendation (confirmed with requester): a thin, stateless, log-free
serverless proxy for email breach checks, isolated from the static app and
fully optional; password checks stay client-side.**

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
  no request logging, no storage, no analytics, minimal headers, strict CORS,
  its own rate limiting, deployed separately (e.g., a Cloudflare Worker) so the
  app stays static and self-hostable, and **the app must fully function without
  it** — when the proxy URL is unset, the email check renders as a deep-link to
  haveibeenpwned.com.
- **Honest impact on "no backend":** this *is* a backend. It is the one
  documented exception. It is mitigated by (a) handling only a non-identifying
  prefix, (b) statelessness, (c) physical isolation, (d) optionality. A
  self-hoster who wants zero servers simply omits it.
- **Rejected:** embedding the key client-side (leaks it); keyless email k-anon
  (doesn't exist).

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
