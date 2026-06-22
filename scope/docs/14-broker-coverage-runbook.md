# 14 — Broker Coverage Runbook (depth-first)

The depth-first push on data brokers: take the per-broker opt-out generator from a
token set to ~25 verified people-search / background-check brokers — the surface
where a deadname is most likely to be sitting and most directly removable.

**Why this is a runbook and not a single automated pass:** the broker sites
actively block automated access. From the build environment, ~15 of 22 candidate
opt-out pages returned **403 (WAF)**, several returned **404 (the URL had drifted
since the source list)**, and the headless fetchers (`curl`, WebFetch) are walled
the same way. **Verification requires a real browser.** Authoring an opt-out flow
from memory and stamping it "verified" is exactly the false-confidence failure this
project refuses — a wrong removal step is worse for an at-risk user than an honest
"check this yourself." So: **verify in a browser, then author, then commit.**
`lastVerified` is the honesty signal — set it to the date you actually opened the
page, never earlier.

## Status

**Verified & shipped (5):**

| Broker | Category | Opt-out | Notes |
|---|---|---|---|
| Spokeo | people-search | web-form | linkage-exposing → leave-it guidance |
| Whitepages | people-search | web-form | linkage-exposing → leave-it guidance |
| BeenVerified | background-check | web-form | linkage-exposing → leave-it guidance |
| CheckPeople | people-search | web-form (email suppression) | email-only, no linkage forced |
| InfoTracer | background-check | web-form + privacy email | single-name removal, no linkage forced |

**Remaining target set (~20).** Status is from the verification sweep on
2026-06-22; treat every URL as needing a live re-check regardless.

| Broker | Best-known opt-out URL | Sweep | Family / note |
|---|---|---|---|
| Intelius | `https://www.intelius.com/opt-out/` | 403 | PeopleConnect |
| TruthFinder | `https://www.truthfinder.com/opt-out/` | 403 | PeopleConnect |
| Instant Checkmate | `https://www.instantcheckmate.com/opt-out/` | 403 | PeopleConnect |
| US Search | `https://www.ussearch.com/opt-out/` | 403 | PeopleConnect |
| PeopleSmart | (was `/optout-go`) | **drifted → /help/** | PeopleConnect — find current URL |
| ZabaSearch | `https://www.zabasearch.com/block_records/` | 403 | Intelius/PeopleConnect |
| Addresses.com | `https://www.addresses.com/optout.php` | 403 | Intelius/PeopleConnect |
| AnyWho | `https://www.anywho.com/optout` | 403 | Intelius/PeopleConnect |
| PeopleLooker | (was `/f/optout/search`) | **404 drifted** | BeenVerified family |
| NeighborWho | (was `/optout-search`) | **404 drifted** | BeenVerified family |
| Ownerly | (was `/about/optout/`) | **404 drifted** | BeenVerified family (property data — lower deadname risk) |
| Radaris | `https://radaris.com/control/privacy` | 403 | independent |
| MyLife | `https://www.mylife.com/ccpa/index.pubview` | 403 | independent — historically phone/email; check `requiresId` |
| PeekYou | (was `/about/contact/optout/`) | **drifted → home** | independent |
| Nuwber | `https://nuwber.com/removal/link` | 403 | independent |
| ClustrMaps | `https://clustrmaps.com/bl/opt-out` | conn refused | independent |
| USPhoneBook | `https://www.usphonebook.com/opt-out` | 403 | independent |
| TruePeopleSearch | `https://www.truepeoplesearch.com/removal` | 403 | independent |
| FastPeopleSearch | `https://www.fastpeoplesearch.com/removal` | 403 | independent |
| SearchPeopleFree | `https://www.searchpeoplefree.com/opt-out` | 403 | independent |

**Batch by family.** PeopleConnect (Intelius, TruthFinder, Instant Checkmate, US
Search, PeopleSmart, ZabaSearch, Addresses, AnyWho) often share one suppression
portal; BeenVerified's siblings (PeopleLooker, NeighborWho, Ownerly) share its
flow. Verify the parent once, then confirm each sibling's entry point.

## Per-broker workflow

For **each** broker:

1. **Open the live opt-out page in a real browser.** Confirm the current URL
   (several above have moved — find the new one), the method, and the steps.
2. **Decide the safety-critical fields** (these are human judgment — never copy
   them blind from a list):
   - `optOutExposesLinkage` — *does submitting the opt-out itself force disclosing
     the current↔former-name link to this broker?* (R13). If the flow only takes an
     email, or removes a single named listing, the answer is usually **false**. If
     it makes you assert "also known as / formerly" to match the record, it's
     **true**.
   - `leaveItGuidance` — **required when `optOutExposesLinkage` is true** (the CI
     validator enforces this). One honest sentence on when leaving the listing and
     monitoring beats opting out.
   - `requiresId` — true if the broker demands a government ID / photo. Drives the
     minimize-disclosure warning.
   - `exposesDeadnameRisk` — `high` for people-search sites that surface name
     history; lower for property/marketing aggregators.
   - `methods` + the matching contact field (`webFormUrl` / `email` /
     `mailingAddress`) — the validator requires the field for each method listed.
3. **Author** `content/brokers/us/<slug>.json` from the template below.
4. **Regenerate + validate:** `npm run generate:content && npm run validate:content`
5. **Add it to discovery** if it should be guided: append the slug to `refIds` in
   `content/discovery/us/brokers-people-search.json` (cap the guided list at ~8 of
   the highest-risk; the rest are reachable on `/remediate` via its filter).
6. **Gate + commit:** `npm run typecheck && npm test`, then commit.

## JSON template

```json
{
  "slug": "<lowercase-hyphenated>",
  "jurisdiction": { "country": "us" },
  "name": "<Display Name>",
  "category": "people-search",
  "exposesDeadnameRisk": "high",
  "searchUrl": "https://<broker>/",
  "optOut": {
    "methods": ["web-form"],
    "webFormUrl": "https://<verified-optout-url>",
    "email": null,
    "mailingAddress": null,
    "requiresId": false,
    "optOutExposesLinkage": false,
    "steps": [
      "<step 1 from the live page>",
      "<step 2>"
    ],
    "templateKey": "optout-deletion-generic"
  },
  "notes": "<anything the user should know; e.g. shared portal, phone-only verify>",
  "attribution": "Derived from Big-Ass Data Broker Opt-Out List (CC BY-NC-SA).",
  "sourceUrl": "https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List",
  "lastVerified": "<YYYY-MM-DD you actually checked>"
}
```

If `optOutExposesLinkage` is `true`, add a `leaveItGuidance` string inside `optOut`
(otherwise the content validator fails the build — by design).

## Licensing — one-time maintainer decision

The seed data comes from the **Big-Ass Data Broker Opt-Out List**, licensed
**CC BY-NC-SA 4.0**. Each broker file already carries `attribution` + `sourceUrl`.
Two obligations to confirm before public release:

- **BY** — attribution is preserved per entry (done). Consider a top-level
  `NOTICE` crediting the source list.
- **NC + SA** — NonCommercial means Errata must stay non-commercial; ShareAlike
  means our derived broker content should be offered under CC BY-NC-SA. Confirm the
  repo's overall license is compatible (or dual-license the `content/brokers/`
  tree). Independently-authored steps (verified from the broker's own page rather
  than copied from the list) are facts and carry less entanglement, but keeping the
  attribution is the safe default.

## What "done" looks like

~25 brokers, every one with a `lastVerified` reflecting a real browser check, the
guided discovery list curated to the top ~8 by risk, and all gates green
(`generate:content` → `validate:content` → `report:staleness` → `typecheck` →
`test`). The architecture already scales to this; the work is verification time.
