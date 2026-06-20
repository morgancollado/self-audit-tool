# 05 — Content Sourcing & Maintenance

Answers hard-decision #1 (data freshness without a backend) in operational
detail, and defines the **content-as-data schemas** for a multi-jurisdiction
tool.

## Sourcing strategy by content type

| Content | Primary source | Mode | Refresh owner |
|---------|----------------|------|---------------|
| **US brokers + opt-out steps** | [BADBOL](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List) (CC BY-NC-SA), transformed to JSON | Adopt + transform | Solo dev + community PRs; sync from upstream periodically |
| **US law framing** | CCPA/CPRA, CA DELETE Act / DROP, state patchwork — primary/official summaries | Author | Solo dev, reviewed |
| **Colombia brokers** | Authored from research (DataCrédito/TransUnion CO, *consulta de datos* sites, electoral-roll exposure) — **no existing dataset** | Author from scratch | Solo dev + CO community PRs |
| **Colombia law framing** | Ley 1581 de 2012, Decreto 1377, SIC complaint path | Author | Solo dev, reviewed |
| **Platform hardening + deadname removal** | First-party verification per platform | Author + verify | Solo dev; highest rot rate |
| **Concept explainers** | Link out (EFF SSD, etc.) | Link | n/a |

## Freshness mechanism (decision #1, operationalized)

1. **Default — versioned-in-repo + redeploy.** All content is JSON in
   `/content`, bundled at build. Source of truth = the repo. Updates = edit
   JSON → PR → merge → redeploy. Works offline, reproducible builds, zero
   runtime egress.
2. **Per-record freshness metadata.** Every content record carries
   `lastVerified` (date) and `sourceUrl`. The UI shows "Last verified: <date>"
   on each guide and can visually flag records older than N months as
   "may be out of date — verify at source." This makes staleness *visible*
   instead of silent — the realistic mitigation for a solo dev.
3. **Optional opt-in runtime refresh.** A read-only `content.json` mirrored to
   GitHub raw / a neutral CDN; the app can fetch it (plain GET, no user data,
   only the user's IP reaches the CDN) to get newer content between deploys.
   **Off by default**, clearly labeled, with the bundled copy as fallback so
   offline still works.
4. **Community contribution workflow.** A `CONTRIBUTING.md` + JSON schema +
   schema-validation CI so non-developers can submit broker/platform
   corrections as PRs (BADBOL already cultivates this culture — inherit it).

**Why not auto-scrape:** unsustainable and brittle for one person, and
build-time live fetches break reproducibility and offline builds. Visible
freshness metadata + community PRs is the durable answer.

## Content-as-data schemas

### Broker (jurisdiction-scoped)

```jsonc
// /content/brokers/us/spokeo.json
{
  "slug": "spokeo",
  "jurisdiction": "us",
  "name": "Spokeo",
  "category": "people-search",
  "exposesDeadnameRisk": "high",        // surfaces name history / relatives
  "searchUrl": "https://www.spokeo.com/",   // for Phase-1 "find yourself"
  "optOut": {
    "methods": ["web-form"],            // web-form | email | mail | phone
    "webFormUrl": "https://www.spokeo.com/optout",
    "email": null,
    "mailingAddress": null,
    "requiresId": false,
    "steps": [
      "Find your listing via the search URL.",
      "Copy the profile URL.",
      "Submit it on the opt-out page with your email.",
      "Confirm via the verification email."
    ],
    "templateKey": "ccpa-deletion-generic"  // -> /content/templates
  },
  "notes": "Re-check in ~6 months; brokers often re-list.",
  "attribution": "Derived from Big-Ass Data Broker Opt-Out List (CC BY-NC-SA).",
  "sourceUrl": "https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List",
  "lastVerified": "2026-06-01"
}
```

```jsonc
// /content/brokers/co/datacredito.json  (authored; illustrative)
{
  "slug": "datacredito",
  "jurisdiction": "co",
  "name": "DataCrédito (Experian)",
  "category": "credit-bureau",
  "exposesDeadnameRisk": "medium",
  "searchUrl": "https://www.midatacredito.com/",
  "optOut": {
    "methods": ["web-form", "email"],
    "requiresId": true,
    "steps": [
      "Ejerce tu derecho de habeas data como titular (Ley 1581 de 2012).",
      "Presenta una consulta o reclamo ante el responsable del tratamiento.",
      "El responsable debe responder la consulta en máx. 10 días hábiles.",
      "Si no resuelven, presenta queja ante la SIC tras agotar el reclamo."
    ],
    "templateKey": "habeas-data-co-reclamo"
  },
  "notes": "En CO el ecosistema es de centrales de riesgo, no 'people-search' al estilo EE. UU.",
  "lastVerified": "2026-06-01"
}
```

### Law framing (jurisdiction-scoped, informational only)

```jsonc
// /content/law/us/ccpa.json
{
  "jurisdiction": "us",
  "key": "ccpa-cpra",
  "title": "California (CCPA/CPRA) deletion & opt-out rights",
  "summary": "California residents can request deletion and opt out of sale/share...",
  "authorizedAgent": true,
  "specialMechanisms": [
    {
      "key": "ca-drop",
      "title": "California DROP (Delete Request & Opt-out Platform)",
      "summary": "Single request to all registered data brokers; live 2026, broker compliance mandatory from Aug 1 2026.",
      "url": "https://cppa.ca.gov/"
    }
  ],
  "disclaimer": "Informational only — not legal advice.",
  "lastVerified": "2026-06-20"
}
```

### Platform guide (locale-translated, jurisdiction-agnostic)

```jsonc
// /content/platforms/google.json
{
  "slug": "google",
  "name": "Google / Search",
  "deadnameRemoval": {
    "supported": true,
    "tool": "Results about you",
    "url": "https://support.google.com/websearch/answer/12719076",
    "steps": ["..."],
    "limits": "Search-visibility tool; does NOT remove data from broker sites.",
    "escalation": "If denied, re-request with legal-name-change documentation; consider regulator routes."
  },
  "hardening": { "steps": ["..."] },
  "lastVerified": "2026-06-15"
}
```

### Templates (opt-out output; locale-translated)

```jsonc
// /content/templates/ccpa-deletion-generic.json
{
  "key": "ccpa-deletion-generic",
  "formats": ["text", "mailto", "letter"],
  "subject": "CCPA/CPRA Request to Delete Personal Information",
  "body": "To whom it may concern,\n\nUnder the CCPA/CPRA, I request deletion of all personal information you hold about me... {{name}} {{aliases}} {{location}}",
  "placeholders": ["name", "aliases", "location"],
  "disclaimer": "Informational template — not legal advice."
}
```

Placeholders are filled **in-memory** at generation time from the transient
identity input (and only persisted if the user opted in — see [04](04-data-model.md)).

## Resolution rules (locale × jurisdiction)

- **Brokers & law:** selected strictly by `jurisdiction`. **No cross-
  jurisdiction fallback** — never show US law to a CO user.
- **Platform guides & templates:** selected by `jurisdiction` where relevant
  (templates cite the applicable law), translated by `locale` with fallback to
  the base locale (`en`) for missing strings only.
- **UI strings:** `next-intl` catalogs, `en` base with `es` overlay.

## Maintenance cadence (realistic for one person)

- **Monthly:** spot-check the highest-traffic broker + platform records; bump
  `lastVerified`; merge community PRs.
- **Quarterly:** sync from BADBOL upstream; review CA DROP / state-law changes.
- **As-needed:** platform name-removal flows when a platform changes UI
  (community PRs are the early-warning system).
