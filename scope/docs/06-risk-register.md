# 06 — Risk Register

Risks ordered roughly by severity for this population. Each has an owner-
actionable mitigation. The breach-check egress decision and the legal-advice
risk get extended treatment because they are the load-bearing ones.

| # | Risk | Likelihood × Impact | Mitigation | Residual |
|---|------|---------------------|------------|----------|
| R1 | **Honeypot: tool stores/leaks what users searched (deadname, accounts, location)** | Low × Catastrophic | No server storage; off-by-default name retention; ephemeral mode; panic-delete; no analytics/trackers; CSP blocks third-party egress | Device-access exposure (see R3) |
| R2 | **Breach-check email leaks PII to a server** | Med × High | Stateless, log-free proxy receiving only a 6-char hash prefix (k-anonymity); proxy optional; deep-link fallback | Proxy operator trust (see below) |
| R3 | **Hostile party with physical/account access to the device reads local state** | Med × High | Ephemeral mode; panic-delete; off-by-default name save; explicit shared/monitored-device warnings; no "remember me" | Cannot fully defend an unlocked device — stated honestly in UI |
| R4 | **Unauthorized practice of law / harmful legal misinformation** | Med × High | "Informational, not legal advice" disclaimers; cite primary sources; frame rights/options, never advise a specific situation; per-jurisdiction review | Law changes between reviews (R5) |
| R5 | **Data staleness (broker URLs/steps, platform flows, law) rot** | High × Med | `lastVerified` + `sourceUrl` per record, visibly surfaced; "may be out of date" flagging; community PRs; quarterly upstream sync | Some records always lag |
| R6 | **Supply-chain: a dependency phones home / injects a tracker** | Med × High | Minimal deps; CI "no-tracker" audit fails the build — **`@vercel/analytics` + `@vercel/speed-insights` blocklisted by name** (the likely accidental reintroduction on Vercel); strict CSP; no third-party scripts; lockfile review | New transitive deps need vigilance |
| R7 | **User sends too much ID to a broker that demands it** | Med × Med | Flag `requiresId` brokers; redaction guidance; "send the minimum" framing | User choice |
| R8 | **Subpoena/legal compulsion of project infrastructure** | Low × High | There is nothing to compel — no user data at rest anywhere; proxy keeps no logs; static host has only access logs (IP), mitigated by self-host/offline options | Host-level IP logs outside our control |
| R9 | **Hosting/CDN access logs (IP) deanonymize a visit** | Med × Low/Med | Self-hostable; offline/PWA mode (run with network off); no first-party logging; **on Vercel, minimize log retention/observability** and add nothing on top | Vercel platform request/edge logs (IP) are outside our control — inherent to any host |
| R10 | **Re-traumatization from discovery content** | Med × Med | Content warnings before discovery steps; calm copy; user-paced; crisis resources (Trans Lifeline, Access Now) in footer | Inherent to the task; minimized |
| R11 | **Colombia/LatAm content wrong because authored without local expertise** | Med × High | Treat `es-CO` as needing local review before release; ship behind a clear "beta/region" label until reviewed; community contribution | Until reviewed, risk is real — gate the milestone |
| R12 | **Accessibility regressions exclude disabled users in distress** | Med × Med | axe in CI; manual screen-reader pass per release; keyboard-first design | Continuous vigilance |
| R13 | **Opt-out paradox: remediation deepens the very linkage it targets** | High × High | Per-broker `optOutExposesLinkage`/`requiresId` flags; "sometimes leave it" path as a first-class outcome; redaction guidance; informed-choice UI, not blind submission | User must still judge each case |
| R14 | **Plaintext export honeypot on the user's own disk / cloud-synced Downloads** | Med × High | **Encrypted-by-default export** (WebCrypto); plaintext only as a warned opt-out; warn that Downloads often auto-syncs to iCloud/Drive | User can still mishandle the passphrase/file |
| R15 | **Dual-use: the Discover flow is also a doxxing recipe against a third party** | High × Med/High | Conscious framing; decline to spell out the most operational targeting steps; the techniques are already public; position strictly as self-audit; no "search someone else" affordances | Cannot prevent misuse of public knowledge |
| R16 | **Adversary is a state actor (records demand, hostile AG), not just a doxxer** | Med × High | Privacy-route defaults (no project infra in the path by default, see R2); nothing to compel (R8); ephemeral mode; honest "this won't shield you from legal process" framing; route to expert help (Access Now, legal aid) | The legal/political climate is outside our control |
| R17 | **Solo-dev bus factor on safety-critical, fast-rotting content** | Med × High | `lastVerified` flagging; community PR culture; **a continuity plan** — co-maintainers / an org home / an explicit "this may be stale" honesty banner if maintenance lapses; everything self-hostable so a fork can carry on | A single maintainer is a real fragility |
| R18 | **iOS/storage eviction silently drops "resume later" progress** | Med × Low/Med | `navigator.storage.persist()`; honest per-platform durability note; nudge an encrypted export as the durable backup | Browser storage policies outside our control |

## Extended: the breach-check egress decision (R2) and its resolution

**Decision (revised — privacy route):** ship the client-side **password** check
unconditionally; provide **email** breach checks through a **thin stateless
serverless proxy**, the one consciously accepted relaxation of "no backend."
**The default is the path that routes the user through *no* project
infrastructure — the deep-link.** The self-hosted proxy is the integrated
opt-in. The project's shared OHTTP-fronted instance is **not shipped in v1.** We
reversed the earlier "shared proxy as default" call: for a population whose
premise is "the architecture is the safety feature," and whose adversary may
have subpoena power (R16), routing users through project-operated infrastructure
is the wrong instinct. The integrated experience is available to anyone who
self-hosts; no one is routed through project infrastructure at all.

> **OHTTP caveat (why the shared rung is deferred, not just demoted):** the
> "no single party sees IP + prefix" guarantee holds **only if the relay and
> gateway are run by separate, non-colluding parties.** With no independent
> relay partner, the project would run both and it collapses to "trust me not to
> log" — so the shared rung is dropped for v1 and revisited only if such a
> partner appears. See [08](08-open-questions.md) Q2.

**What the proxy MUST guarantee (acceptance criteria):**
- Receives **only** the first 6 hex chars of `SHA-1(normalized email)` — never
  the email, never the full hash.
- **No logging** of request bodies, query params, or client IPs beyond what is
  strictly forced by the platform, and no persistence of any kind (no DB, no
  KV, no files).
- Holds the `hibp-api-key` as a secret; never returns it; does the final
  HIBP call server-to-server.
- **CORS** locked to the app origin — treated as **UX hygiene, not a security
  boundary** (CORS is browser-enforced; a script or `curl` ignores it). The real
  abuse controls are the **prefix-only design + the proxy's own rate limiting**.
  Minimal response (the hash-suffix list HIBP returns; client matches locally).
- **Physically separate deploy** (e.g., Cloudflare Worker) so the app stays a
  pure static artifact and self-hosters can omit it.
- **Graceful degradation:** when the proxy URL is unset, the email feature
  renders as a **deep-link to haveibeenpwned.com** — the app never breaks and
  stays 100% static.

**Why a proxy is unavoidable (verified against HIBP's API docs):** HIBP allows
CORS only for *non-authenticated* APIs and states key'd endpoints must not be
hit client-side; the email hash-**range** (k-anonymity) endpoint still needs the
key, and HIBP requires a `User-Agent` browsers can't set cross-origin. So a
proxy is the *only* way to integrate email checks — even with a user's own key.
The full tradeoff ladder (deep-link → self-hosted proxy → OHTTP-fronted shared
instance) is the **tiered access model** in [03](03-architecture.md), Decision 2.

**Why this honors the spirit of "no user data on a server":** the only thing
the server ever sees is a non-identifying prefix shared by thousands of
addresses, held in memory for the duration of one request and then gone. A
self-hoster who wants literal zero servers turns it off and uses the deep-link.

**Residual risk:** users must trust whoever operates the proxy not to log at the
platform edge — which sees `source IP + 6-char prefix + timing`, revealing
*that a breach check happened from this IP*, not the address. Mitigations:
open-source the proxy, document the deploy, let users point the app at their
**own** proxy (operator == user), and default to the deep-link if they prefer
zero trust. For a shared instance, front it with an **OHTTP / Oblivious HTTP
relay** so IP and prefix are never visible to the same party — converting
"trust me not to log" into a structural guarantee.

## Extended: legal-content risk (R4)

The tool **states rights and procedures**; it **does not give legal advice.**

- A persistent, plain disclaimer: *"This is general information, not legal
  advice. Laws change and your situation may differ."*
- All legal content cites **primary/official sources** with a `lastVerified`
  date.
- **Authorized-agent** and state-law mechanisms (incl. CA DROP) are presented as
  *options that exist*, with links to the official mechanism — not as a
  recommendation for the individual.
- For Colombia, the same standard applies to Ley 1581 / SIC content, with the
  added gate that it should be reviewed by someone with local knowledge before
  general release (R11).
- Crisis/escalation resources are offered for users facing active threats
  (this is support routing, not legal advice).
