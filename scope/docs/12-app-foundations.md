# 12 — App Foundations (M0): CSP, content schema, staleness reporting

These are the first implemented pieces of Errata (M0). They live at the repo
root as real code, not just prose. This doc explains the three decisions and
points at the files.

## 1. CSP: nonce where we can, hashes where we must

**The honest constraint:** a per-request **nonce** needs a server to mint a fresh
value per response. A **pure static export** (`output: 'export'`) has no
per-request server step, so it *cannot* use nonces. The resolution is a **dual
delivery** — identical app code, two CSP mechanisms keyed to the deploy mode:

| Mode | How it ships | CSP source | Strength |
|------|--------------|-----------|----------|
| **Dynamic (default, Vercel)** | Next.js + edge **middleware** | per-request **nonce** + `strict-dynamic` | strongest, low-maintenance |
| **Static (`STATIC_EXPORT=1`)** | static `out/` artifact | build-time **sha256 hashes** injected into `<meta>` + `_headers` | self-host / offline; more brittle |

- **Is the middleware a "backend"?** No. It is a **stateless header-setter**: it
  mints a nonce, attaches the CSP + security headers, and forwards the request.
  It reads no body, stores nothing, logs nothing, touches no user data. It sees
  the request IP exactly as any host's access log already does
  ([06](06-risk-register.md) R9). The one documented backend exception remains
  *only* the optional breach proxy ([03](03-architecture.md) Decision 2).
- **`strict-dynamic`** is used **only on the dynamic (nonce) build**, where the
  nonce-trusted bootstrap loads the rest of the app. It is deliberately
  **omitted from the static (hash-only) CSP**: there the framework chunks are
  parser-inserted, same-origin `<script src>` tags with no nonce, so
  `strict-dynamic` would make browsers ignore `'self'` and refuse them — a dead,
  un-hydrated shell. Plain `'self'` allows those chunks while the inline hashes
  still pin inline scripts. Neither build needs `'unsafe-inline'`.
- **No CSP `report-uri`/`report-to`** — reporting would phone home; deliberately
  omitted (consistent with the no-tracker rule).
- **Self-hosters who want the stronger nonce path** can run the same app in
  dynamic mode behind any platform with edge middleware; the static build is the
  zero-server fallback and is what makes true offline use possible.

**Files:** `lib/security/csp.ts` (single CSP source of truth) ·
`middleware.ts` (nonce, dynamic) · `scripts/generate-csp-hashes.mjs` (hashes,
static) · `vercel.json` (non-nonce security headers) · `app/layout.tsx` (nonce
wiring) · `next.config.mjs` (mode switch).

> **Verified on real output, and now automated:** both builds were loaded in
> headless Chromium under the **enforced** CSP. The dynamic build's per-request
> nonce matches the framework `<script>` tags; the static export hydrates with
> **zero** CSP violations and no `'unsafe-inline'`/`'unsafe-eval'`. Guarded
> against regression by `npm run test:csp` (`scripts/csp-smoke.mjs`) in CI — a
> green build alone does **not** prove the app runs under its CSP, which is
> exactly how an earlier `strict-dynamic` self-block slipped through.

## 2. Content-as-data JSON Schema + the no-dead-end gate

All broker/platform/law/record/template content is validated against Draft
2020-12 schemas in CI. The schemas encode the product's hard rules so bad content
**cannot ship**:

- **No dead-ends** (`record.schema.json`): a record must carry a non-empty
  `actions` array **or** be an explicit `monitorOnly: true` + `permanence:"high"`
  item with `harmReduction`. Brokers/platforms get the same guarantee via
  `minItems: 1` on opt-out/hardening steps. *(Verified: the validator rejects an
  actionless record with exit 1.)*
- **State-aware law** (`law.schema.json`): `appliesNationally: false` ⇒ the
  record must name its `region`, so CCPA framing can never leak to a non-CA user.
- **Opt-out paradox** (`broker.schema.json`): `optOutExposesLinkage` +
  `leaveItGuidance` are first-class fields (R13).

**Files:** `content/schema/*.schema.json` · `lib/content/validate.mjs`
(ajv + cross-field checks) · `content/schema/README.md` · seed content
`content/brokers/us/spokeo.json`, `content/records/us-CA/name-change-court.json`.

## 3. "Report this guide is broken" (the only staleness signal)

With **zero analytics**, we have no automated way to learn a broker/platform flow
has rotted. The escape hatch is a button that opens a **prefilled GitHub issue**
— a plain navigation to github.com, nothing routed through Errata. The structured
fields (slug, type, version) already locate the staleness, so the free-text note
is **optional and de-emphasized**, and the UI states plainly that the issue is
**public and filed under the user's own GitHub account** and warns against
including any personal info. The builder additionally **scrubs** emails and long
digit runs as defense-in-depth. This is the one feature that intentionally leaves
the device, so the framing — not the scrub — is the primary control.
*(Verified by unit tests.)*

**Files:** `lib/report/issue-url.ts` · `lib/report/issue-url.test.ts` ·
`components/ReportBroken.tsx`.

## 4. The safety shell (storage, modes, panic-delete)

The non-negotiable core (scope/docs/04-data-model.md), built backend-agnostic so
the same logic runs in every mode and is testable in Node.

- **Storage backends** (`lib/storage/`): a `KeyValueBackend` interface with a
  `MemoryBackend` (ephemeral + test double), `IndexedDbBackend` (persistent
  audit state), and `LocalStorageBackend` (namespaced prefs). Browser backends
  are guarded by availability checks and **fail safe to memory/ephemeral**.
- **`AuditStore`** loads/mutates/persists the single audit document; `migrate.ts`
  runs ordered migrations and **refuses a newer-than-supported backup** rather
  than corrupting it.
- **`StorageManager`** owns the three modes and the **panic path**:
  - *ephemeral* writes nothing to disk — **proven by test** (`persistentAudit`
    stays empty while data lands only in the ephemeral backend);
  - `wipeAll()` clears **every** backend (active and inactive) **plus** a
    platform-level hard wipe (deletes the IndexedDB database, clears namespaced
    localStorage) — **proven by test**;
  - switching persistent → ephemeral can wipe what was already saved.
- **React shell**: `StorageProvider` starts in **session-only mode and writes
  nothing to disk** (not even the named database) until the user makes an
  explicit choice — opening IndexedDB and requesting `storage.persist()` (R18)
  happen only on opt-in, and `persist()` is off the critical path so it can't
  wedge load. `PanicButton` is always-visible, instant, and unconfirmed by
  design; panic **closes the IndexedDB connection before deleting** so the hard
  wipe takes effect immediately, and it reloads even if a wipe step fails.
  `SafetyIntro` presents the first-run session-only/save choice; `StorageModeToggle`
  switches later. Minimal AA-contrast styling in `app/globals.css`.

**Verified:** `npm run build` (dynamic, nonce middleware) and
`npm run build:static` (export + 15 inline-script hashes, no
`unsafe-inline`/`unsafe-eval`) both pass; `npm run test:csp` loads the static
export in real Chromium and confirms it hydrates under the enforced CSP with no
violations and no pre-consent storage trace; `npm test` is 15/15 green;
`tsc --noEmit` clean.

## Known limitations (tracked for M1)

Accepted for M0, called out so they aren't lost:

- **Single-document audit store.** `AuditStore` reads and rewrites the entire
  `AuditState` (all findings + remediations) on every mutation, keyed `"audit"`.
  Fine at M0 scale; a heavy Discover sweep will make each update rewrite the
  whole blob, and the read-modify-write has no cross-tab guard (last writer
  wins). Revisit with per-record keys / a transaction when M1 brings real volume.
- **Nonce CSP forces dynamic rendering.** Reading the nonce via `headers()` opts
  every route into per-request SSR on Vercel (no full static caching) — the
  deliberate price of the strongest CSP. The static export stays the zero-server
  alternative for hosts/users who prefer caching or offline use.

## CI wiring (M0)

`package.json` scripts, all runnable today:

| Script | Gate |
|--------|------|
| `npm run validate:content` | schema + no-dead-end + cross-field |
| `npm run audit:no-tracker` | blocks `@vercel/analytics`/`speed-insights` & friends (R6) |
| `npm run test:csp` | static export hydrates under its enforced CSP, no pre-consent trace (real browser) |
| `npm run test:report-url` | report URL stays PII-free |
| `npm run typecheck` / `lint` | standard |

(axe accessibility check is added when the first real UI lands.)
