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
| R6 | **Supply-chain: a dependency phones home / injects a tracker** | Med × High | Minimal deps; CI "no-tracker" audit fails the build; strict CSP; no third-party scripts; lockfile review | New transitive deps need vigilance |
| R7 | **User sends too much ID to a broker that demands it** | Med × Med | Flag `requiresId` brokers; redaction guidance; "send the minimum" framing | User choice |
| R8 | **Subpoena/legal compulsion of project infrastructure** | Low × High | There is nothing to compel — no user data at rest anywhere; proxy keeps no logs; static host has only access logs (IP), mitigated by self-host/offline options | Host-level IP logs outside our control |
| R9 | **Hosting/CDN access logs (IP) deanonymize a visit** | Med × Low/Med | Self-hostable; offline/PWA mode (run with network off); no first-party logging; recommend privacy-respecting host | Cannot control third-party host logs |
| R10 | **Re-traumatization from discovery content** | Med × Med | Content warnings before discovery steps; calm copy; user-paced; crisis resources (Trans Lifeline, Access Now) in footer | Inherent to the task; minimized |
| R11 | **Colombia/LatAm content wrong because authored without local expertise** | Med × High | Treat `es-CO` as needing local review before release; ship behind a clear "beta/region" label until reviewed; community contribution | Until reviewed, risk is real — gate the milestone |
| R12 | **Accessibility regressions exclude disabled users in distress** | Med × Med | axe in CI; manual screen-reader pass per release; keyboard-first design | Continuous vigilance |

## Extended: the breach-check egress decision (R2) and its resolution

**Decision:** ship the client-side **password** check unconditionally; provide
**email** breach checks through a **thin stateless serverless proxy**, which is
the one consciously accepted relaxation of "no backend."

**What the proxy MUST guarantee (acceptance criteria):**
- Receives **only** the first 6 hex chars of `SHA-1(normalized email)` — never
  the email, never the full hash.
- **No logging** of request bodies, query params, or client IPs beyond what is
  strictly forced by the platform, and no persistence of any kind (no DB, no
  KV, no files).
- Holds the `hibp-api-key` as a secret; never returns it; does the final
  HIBP call server-to-server.
- Strict **CORS** (only the app origin), its **own rate limiting**, minimal
  response (the hash-suffix list HIBP returns; client matches locally).
- **Physically separate deploy** (e.g., Cloudflare Worker) so the app stays a
  pure static artifact and self-hosters can omit it.
- **Graceful degradation:** when the proxy URL is unset, the email feature
  renders as a **deep-link to haveibeenpwned.com** — the app never breaks and
  stays 100% static.

**Why this honors the spirit of "no user data on a server":** the only thing
the server ever sees is a non-identifying prefix shared by thousands of
addresses, held in memory for the duration of one request and then gone. A
self-hoster who wants literal zero servers turns it off and uses the deep-link.

**Residual risk:** users must trust whoever operates the proxy not to log at the
platform edge. Mitigations: open-source the proxy, document the deploy, let
users point the app at their **own** proxy, and default to the deep-link if they
prefer zero trust.

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
