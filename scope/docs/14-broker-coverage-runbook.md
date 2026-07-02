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

**Verified & shipped (14)** — each confirmed against its live opt-out page (browser
capture on the date shown), none authored from a guess.

| Broker | Category | Opt-out | Notes |
|---|---|---|---|
| Spokeo | people-search | web-form | linkage-exposing → leave-it guidance |
| Whitepages | people-search | web-form | linkage-exposing → leave-it guidance |
| BeenVerified | background-check | web-form | linkage-exposing → leave-it guidance |
| CheckPeople | people-search | web-form (email suppression) | email-only, no linkage forced |
| InfoTracer | background-check | web-form + privacy email | single-name removal, no linkage forced |
| Intelius | people-search | web-form (PeopleConnect portal) | email-only suppression, no linkage forced |
| TruthFinder | background-check | web-form (PeopleConnect portal) | " |
| Instant Checkmate | background-check | web-form (PeopleConnect portal) | " |
| US Search | people-search | web-form (PeopleConnect portal) | " |
| ZabaSearch | people-search | web-form (PeopleConnect portal) | covered by the shared suppression |
| Addresses.com | people-search | web-form (PeopleConnect portal) | covered by the shared suppression |
| NeighborWho | people-search | web-form (BeenVerified family) | select-existing-record, no linkage forced |
| Ownerly | other (property) | web-form (BeenVerified family) | medium deadname risk |
| PeopleLooker | background-check | web-form (BeenVerified family) | select-existing-record, no linkage forced |

**Two verified shared flows did the heavy lifting:**
- **PeopleConnect Suppression Center** (`suppression.peopleconnect.us`) — one
  email-only suppression covers Intelius, TruthFinder, Instant Checkmate, US Search,
  ZabaSearch and Addresses.com. (PeopleSmart has pivoted to a B2B sales-data product
  and no longer exposes a consumer opt-out here; AnyWho is likely in this family but
  was not confirmed.)
- **BeenVerified family** — `/svc/optout/search/optouts`: search → select your
  record → email verification link → confirm. Covers NeighborWho, Ownerly,
  PeopleLooker (and BeenVerified itself, via its own `/app/optout/search`).

**Remaining target set (~10), with the *actual* blocker** (from residential-browser
runs on 2026-06-30, not the build sandbox). These are the genuinely hard ones; the
easily-verifiable set is done.

| Broker | Blocker | Path to verify |
|---|---|---|
| USPhoneBook | Cloudflare **terminal hard-block** ("you have been blocked") — hits even a clean residential browser once the IP is flagged | retry from a different network (mobile data) / after the flag clears, then screenshot |
| Nuwber | Cloudflare challenge/hard-block | same |
| TruePeopleSearch | Cloudflare challenge/hard-block | same |
| FastPeopleSearch | Cloudflare challenge/hard-block | same |
| SearchPeopleFree | Cloudflare challenge/hard-block | same |
| PeekYou | `NAME_NOT_RESOLVED` — a privacy DNS resolver (NextDNS/Pi-hole/AdGuard) is blocking the domain | point the browser at normal DNS (1.1.1.1), then capture |
| ClustrMaps | `NAME_NOT_RESOLVED` — same DNS block | same |
| Radaris | the `/control/privacy` URL redirects to a privacy-**scan upsell**, not the removal flow | capture by hand: search your name on radaris.com → open your profile → "Control Information" (phone/email verify) |
| MyLife | removal is phone/email, not a simple web form; the site shows a profile page, not an opt-out | find the current CCPA/opt-out page by hand; set `requiresId` from what it asks |
| AnyWho | 403 | likely covered by the PeopleConnect suppression portal — confirm |

**How to pick these off:** they don't need a bulk run. When you do your own removal
and reach one of these pages in a normal session, screenshot it (as was done for
NeighborWho / Ownerly / PeopleLooker) and it becomes a broker file in minutes.
Fighting a Cloudflare hard-block from a flagged IP is not worth a dedicated sitting.

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

If the broker shares an opt-out backbone with sibling sites (e.g. the PeopleConnect
suppression center, the BeenVerified family), add a top-level `network` object so
`/remediate` folds them into one task:

```json
"network": {
  "key": "<lowercase-hyphenated backbone key>",
  "name": "<display name shown as the task title>",
  "note": "<one line on what the shared request covers>"
}
```

Every member of a network must carry the same `key` and `name` (validator-enforced),
and a network needs at least two members — a one-broker "network" is a mislabel.
Grouping is presentation only: remediations stay keyed by broker slug.

## Licensing — resolved (dual-licensed)

The seed data comes from the **Big-Ass Data Broker Opt-Out List**, licensed
**CC BY-NC-SA 4.0**. That conflicts with a blanket MIT, so the repo is dual-licensed:

- **Code** (everything outside `content/`) — MIT, in [`/LICENSE`](../../LICENSE).
- **`content/brokers/**`** — CC BY-NC-SA 4.0, in
  [`/content/brokers/LICENSE`](../../content/brokers/LICENSE). ShareAlike: our
  derived broker content inherits the license. NonCommercial: Errata stays a free,
  non-commercial tool and any fork must too.
- Attribution (**BY**) is preserved per entry (`attribution` + `sourceUrl`) and
  collectively in [`/NOTICE.md`](../../NOTICE.md).
- `package.json` declares `SEE LICENSE IN NOTICE.md` so the split isn't mis-read as
  plain MIT.

See [`/NOTICE.md`](../../NOTICE.md) for the full statement.

## What "done" looks like

~25 brokers, every one with a `lastVerified` reflecting a real browser check, the
guided discovery list curated to the top ~8 by risk, and all gates green
(`generate:content` → `validate:content` → `report:staleness` → `typecheck` →
`test`). The architecture already scales to this; the work is verification time.
