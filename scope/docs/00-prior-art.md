# 00 — Prior Art & Data Sources

**Goal:** reuse or link to existing work; never reinvent. For each source:
*what it is*, *how we relate to it* (reuse data / link out / complement), and
*license implications*.

## Summary recommendation

- **Adopt the [Big-Ass Data Broker Opt-Out List (BADBOL)](https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List)
  as the US data backbone**, transformed into our structured JSON (it ships as
  prose, not machine-readable data). It is **CC BY-NC-SA 4.0** — compatible
  with a free, non-commercial tool, with attribution and ShareAlike on the
  *data*. License our **code** separately (MIT/Apache-2.0) so NC/SA does not
  bleed into the codebase.
- **Link out, don't duplicate**, for: HIBP (breach checks), EFF SSD (concept
  explainers, Spanish), Just Delete Me / JustGetMyData, Consumer Reports
  Permission Slip, and the platforms' own name-removal pages.
- **Complement** the commercial deletion services (DeleteMe, Optery): we are
  the free/DIY alternative; learn from their broker coverage, don't copy.
- **There is no existing dataset for Colombia / LatAm** in this space — that
  content must be authored from primary legal sources. This is the single
  biggest content gap created by the multi-jurisdiction decision.

---

## Data-broker / opt-out datasets

### Big-Ass Data Broker Opt-Out List (BADBOL) — Yael Grauer
- **What:** the most complete community-maintained list of US data brokers and
  per-broker opt-out instructions. ~6k+ GitHub stars, maintained since 2017,
  updated into 2025. US-focused, volunteer-run.
- **License:** **CC BY-NC-SA 4.0** (verified). Reuse for noncommercial
  purposes with attribution; derivatives must carry the same license.
- **How we relate — ADOPT as backbone (transform):** BADBOL is human-readable
  Markdown, not structured data. We parse/convert it into our broker schema
  (see [05](05-content-sourcing.md)), keep an attribution + upstream-version
  pointer, and contribute corrections back upstream. Our derived broker dataset
  inherits CC BY-NC-SA; our app code does not.
- **Caveats:** NonCommercial blocks a future paid offering built on the data;
  ShareAlike forces our data to stay CC BY-NC-SA. Both are acceptable for a
  free DIY tool. Document the attribution prominently.

### IntelTechniques / Michael Bazzell
- **What:** the "Personal Data Removal Workbook" and curated opt-out links —
  thorough, OSINT-practitioner oriented.
- **License:** the workbook is a freely distributed PDF but **not openly
  licensed** for redistribution/derivation. Treat as **reference, link out** —
  do not ingest as data.
- **How we relate:** use to sanity-check broker coverage and discovery
  techniques; cite and link.

### Commercial deletion services — DeleteMe, Optery
- **What:** paid services that submit broker removals on the user's behalf.
- **How we relate — COMPLEMENT / contrast:** we are the free, DIY,
  no-data-collected alternative. Study their public broker coverage lists to
  find gaps in ours; never scrape proprietary data. Optionally, honestly link
  to them as the "I'd rather pay someone" path (no affiliate links — would
  violate the no-dark-patterns / no-monetization stance unless explicitly
  decided otherwise).

---

## Breach checks

### Have I Been Pwned (HIBP)
- **What:** the canonical breach-notification service.
- **Verified API facts (drives architecture):**
  - **Pwned Passwords range API** — *no auth, no rate limit, k-anonymity*
    (client sends first 5 chars of the SHA-1 of the password). **Safe to call
    directly from the browser.**
  - **Breach search by email** — *requires `hibp-api-key`*, rate-limited by
    subscription tier.
  - **k-anonymity email search** (6-char SHA-1 prefix of normalized email) —
    **still requires an API key** (Pro tier). It is *not* a keyless escape
    hatch.
- **How we relate:** password check runs client-side; email check routes
  through our stateless proxy *using the k-anonymity mode* so the proxy never
  receives the full email or full hash. See [03](03-architecture.md) and
  [06](06-risk-register.md).

---

## Concept explainers, checklists, and trans-specific guidance (link out)

| Source | What | How we relate |
|--------|------|---------------|
| **EFF Surveillance Self-Defense (SSD)** | Plain-language security guides, including Spanish-language versions | **Link out** for "why this matters" explainers; model our calm tone on it. Do not copy text (check CC-BY license terms before quoting). |
| **Just Delete Me** | Directory of account-deletion links + difficulty ratings | **Link out / optionally ingest** the difficulty signal per platform; verify license before bulk reuse. |
| **JustGetMyData** | Directory of data-export links | **Link out** to help users pull their own data before deleting. |
| **Consumer Reports "Permission Slip"** | App that sends data-deletion requests | **Complement / link** as a managed alternative for non-technical users. |
| **Trans Lifeline** | Crisis + community support for trans people | **Link** in the safety/resources footer; not a data source. |
| **GLAAD Social Media Safety** | Platform-specific safety guidance for LGBTQ users | **Reference** when authoring our platform-hardening + name-removal content. |
| **Access Now (Digital Security Helpline)** | Expert help for at-risk users | **Link** as an escalation path when the user faces an active threat. |

> **Citing the workshop origin:** Imani Thompson's *Cache Me Outside* /
> *"404: Deadname Not Found"* is verified via 404 Media's reporting. Cite it as
> inspiration and credit the community origin; do not claim affiliation.

---

## What we must author ourselves (no reusable source exists)

1. **Colombia / LatAm legal + broker content.** Ley 1581 de 2012 (Habeas
   Data), Decreto 1377, and the SIC complaint path must be summarized from
   primary sources; the LatAm "data broker" ecosystem differs structurally
   from the US (credit bureaus like DataCrédito/TransUnion CO, *consulta de
   datos* sites, electoral roll exposure). No BADBOL-equivalent exists.
2. **Platform name-removal / deadname flows.** These rot fastest and need
   first-party verification per platform (Google "Results about you", X, Meta,
   Instagram, LinkedIn, TikTok, Reddit).
3. **Trans-specific exposure surfaces** beyond brokers: school/university
   records, professional licensing boards, old bylines/bona-fides, court
   records, and the escalation playbook when a platform resists a deadname
   removal.
