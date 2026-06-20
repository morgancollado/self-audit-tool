# 10 — Stress-Test Findings & Where They Landed

This pass pressure-tested the plan against the real goal (help trans/queer users
reduce deadname + doxxing exposure) and against the population's threat model.
Each finding below is now **baked into the relevant doc** — this page is the
traceability record, not a parking lot.

## Headline reframe

| Finding | Resolution | Folded into |
|---------|-----------|-------------|
| The plan promised "remove every reference"; that's unachievable (breach dumps, archives, caches, non-complying third parties are permanent) | Promise reframed to **find + reduce/manage**, doing as much work as possible **without holding user data** | [README](../README.md), [01](01-mvp.md), [09](09-removal-feasibility.md) |
| Risk of handing users an unactionable list | **No-dead-end rule**: every finding carries an action or is a demoted "monitor" footnote | [09](09-removal-feasibility.md), [README](../README.md), [01](01-mvp.md), [02](02-features-moscow.md), [04](04-data-model.md), [05](05-content-sourcing.md) |
| Automation ceiling unclear | **95% rule** (prepared in-memory, user presses send); custody = the honeypot; ladder of rungs | [09](09-removal-feasibility.md), [03](03-architecture.md) |

## Edge cases we had not accounted for

| # | Edge case | Resolution | Folded into |
|---|-----------|-----------|-------------|
| 1 | **Opt-out paradox** — removal often forces disclosing current↔deadname linkage to an untrustworthy broker | Per-broker `optOutExposesLinkage`/`requiresId` flags; first-class "leave it" outcome; informed-choice UI | R13 in [06](06-risk-register.md); [04](04-data-model.md); [05](05-content-sourcing.md); [02](02-features-moscow.md) |
| 2 | **Legal name-change / court records** — often the largest, most permanent deadname source | First-class flow incl. **sealed-petition** routes; promoted to Must | [01](01-mvp.md), [02](02-features-moscow.md), [05](05-content-sourcing.md), [07](07-roadmap.md) |
| 3 | **Dual-use** — Discover is also a doxxing recipe | Conscious framing; no "look someone else up" affordance; documented residual | R15 in [06](06-risk-register.md); [02](02-features-moscow.md) |
| 4 | **"US" jurisdiction too coarse** — rights are sub-national | **Hierarchical `country`+`region`** jurisdiction; never imply CCPA rights where they don't exist | [03](03-architecture.md), [04](04-data-model.md), [05](05-content-sourcing.md); Q9 in [08](08-open-questions.md) |
| 5 | **State-actor adversary**, not just doxxers | Privacy-route defaults; "won't shield you from legal process" honesty; route to expert help | R16 in [06](06-risk-register.md) |
| 6 | **Shared OHTTP proxy as default** was wrong for this population; OHTTP non-collusion unstated | **Reversed to privacy route** — deep-link default, self-host opt-in, **shared project proxy dropped for v1** (revisit only with an independent relay partner) | [03](03-architecture.md) Decision 2; R2 in [06](06-risk-register.md); Q2 in [08](08-open-questions.md); [07](07-roadmap.md) M3 |
| 7 | **Finding-without-fixing** re-traumatization | Folded into the no-dead-end rule; breaches/archives/caches all get attached actions | [09](09-removal-feasibility.md); [02](02-features-moscow.md) |
| 8 | **Plaintext export honeypot** (cloud-synced Downloads) | **Encrypted-by-default export** (was a `Could`, now Must) | R14 in [06](06-risk-register.md); [04](04-data-model.md); [02](02-features-moscow.md) |
| 9 | **iOS/storage eviction** silently drops "resume later" | `storage.persist()`; honest durability note; nudge encrypted export | R18 in [06](06-risk-register.md); [04](04-data-model.md) |
| 10 | **Panic-delete false confidence** (can't wipe history / exported files) | Honestly-scoped copy where the button lives | [04](04-data-model.md); [07](07-roadmap.md) M0 |
| 11 | **Solo-dev bus factor** on safety-critical, fast-rotting content | Continuity plan: co-maintainers / org home / honest stale banner | R17 in [06](06-risk-register.md); [07](07-roadmap.md) |
| 12 | **No community co-design** before build | Moved to **M0**, before building | [07](07-roadmap.md) M0 |
| 13 | **Reverse-image-search upload** caveat | Links-out only; warn if a target tool forces an upload | [02](02-features-moscow.md) |

## New capability added: the automation ladder

The feasibility analysis produced a new doc, [09](09-removal-feasibility.md),
defining the four rungs (static list → prepared in-memory actions → DROP →
on-device extension → ✗ server custody) and committing v1 to Rung 1, DROP as a
hero feature, and the browser extension as roadmap **M6**.

## Decisions reversed / made this session
- **Breach-check default:** shared OHTTP proxy → **deep-link (privacy route)**;
  **the shared project proxy is dropped for v1** (self-host is the integrated
  opt-in; revisit only with an independent OHTTP relay partner). (User-directed.)
- **US jurisdiction:** coarse "US" → **full state coverage target (all 50 + DC)**,
  CA-first, honest about thin-rights states. (User-directed.)
- **Encrypted export:** `Could` → **Must (default)**.
- **Legal name-change / archive-cache removal:** `Should`/implicit → **Must**;
  **research + flow scaffolding start now**, content release gated on legal
  review. (User-directed.)
- **Browser extension (M6):** confirmed post-v1, Chromium + Firefox. (User-directed.)
- **Dual-use residual (R15):** accepted with mitigations. (User-directed.)

## Open questions — all resolved this round
Q2, Q9, Q10, Q11, Q12, Q13 are **decided** (see [08](08-open-questions.md)).
The remaining standing items are the original Q1 (name **decided: Errata**; only
domain/visibility left), Q3–Q8 (Colombia depth & review,
Colombia depth & review, hosting, commercial links, encrypted-export already
decided, name-retention default, funding).
