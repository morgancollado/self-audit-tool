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
- **`strict-dynamic`** lets the trusted bootstrap (nonce- or hash-allowed) load
  the rest of the app, so we never need `'unsafe-inline'` for scripts.
- **No CSP `report-uri`/`report-to`** — reporting would phone home; deliberately
  omitted (consistent with the no-tracker rule).
- **Self-hosters who want the stronger nonce path** can run the same app in
  dynamic mode behind any platform with edge middleware; the static build is the
  zero-server fallback and is what makes true offline use possible.

**Files:** `lib/security/csp.ts` (single CSP source of truth) ·
`middleware.ts` (nonce, dynamic) · `scripts/generate-csp-hashes.mjs` (hashes,
static) · `vercel.json` (non-nonce security headers) · `app/layout.tsx` (nonce
wiring) · `next.config.mjs` (mode switch).

> **Open verification task (do in M0):** after the first real `next build`,
> confirm the dynamic CSP has **no** `'unsafe-inline'`/`'unsafe-eval'` in
> `script-src`, and that the static export's injected hashes cover every inline
> script Next emits. Next's framework scripts are the thing most likely to need
> attention; budget a half-day to lock this down on real output.

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
— a plain navigation to github.com, nothing routed through Errata, and **no PII**:
only the content slug, type, version, and a user note. The builder additionally
**scrubs** emails and long digit runs as defense-in-depth, and the prefilled body
warns the user not to include personal info. *(Verified by unit tests.)*

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
- **React shell**: `StorageProvider` (loads state, requests
  `storage.persist()` against iOS eviction — R18), `PanicButton` (always-visible,
  instant, unconfirmed by design), `SafetyIntro` (first-run shared-device
  warning + ephemeral offer), `StorageModeToggle`. Minimal AA-contrast styling
  in `app/globals.css` using the Errata palette.

**Verified:** `npm run build` (dynamic, nonce middleware) and
`npm run build:static` (export + 15 inline-script hashes, no
`unsafe-inline`/`unsafe-eval`) both pass; `npm test` is 14/14 green;
`tsc --noEmit` clean.

## CI wiring (M0)

`package.json` scripts, all runnable today:

| Script | Gate |
|--------|------|
| `npm run validate:content` | schema + no-dead-end + cross-field |
| `npm run audit:no-tracker` | blocks `@vercel/analytics`/`speed-insights` & friends (R6) |
| `npm run test:report-url` | report URL stays PII-free |
| `npm run typecheck` / `lint` | standard |

(axe accessibility check is added when the first real UI lands.)
