# 09 — Removal Feasibility & the Automation Ceiling

This document answers the load-bearing product question directly: **how much of
the removal can the tool actually do for the user, and where is the hard wall?**
It exists because the difference between "a tool that removes your deadname" and
"a tool that hands you a list of things you can't fix" is the difference between
this product mattering and this product being abandoned.

## The one-sentence answer

> **A friction-free "we silently remove everything for you" tool is not feasible
> without becoming the exact honeypot this whole project refuses to be. A tool
> that does ~95% of the work and leaves the user the final keystroke — and that
> never surfaces a finding without an attached action — is feasible, and that is
> what we build.**

## Why full auto-removal collides with the safety architecture

To act on someone's behalf, *something* must do one of three things, and all
three break the [non-negotiable safety architecture](../README.md):

1. **Hold the user's PII on a server** to submit requests for them. That server
   now stores trans people's `current-name ↔ deadname ↔ address` maps — the
   catastrophic, subpoenable honeypot. **This is precisely why DeleteMe / Optery
   charge money and hold your data:** someone has to custody the PII and absorb
   the per-broker labor. The automation is not the hard part; the *custody* is,
   and custody is the thing we refuse.
2. **Hold the user's credentials** (Google, platform logins) to act as them.
   Same problem, worse.
3. **Act as a legal *authorized agent*** (CCPA/CPRA) so the operator submits
   deletions for the user. This makes the operator a compellable holder of
   exactly the linkage that gets people hurt.

"Invisible background scrubbing for an arbitrary user" requires (1), (2), or
(3). This is not a plan weakness — it is the physics of the problem. **Our niche
is the gap the paid services leave open: maximally automated removal _without_
data custody.**

## The automation ladder (where each rung is feasible)

| Rung | Experience | Custody cost | Feasible here? |
|------|-----------|--------------|----------------|
| 0 | Static list of links | none | Trivial — and the failure mode we reject (see the attached-action rule) |
| 1 | **Prepared one-click actions** — pre-filled `mailto:` / form text / printable letter, generated in-memory; user presses send | **none — PII never leaves the device** | **Yes. This is the v1 maximum.** |
| 2 | **California DROP** — one state-operated request removes the user from *all* registered brokers, legally enforced | none — the *state* holds it, not us | **Yes, for CA residents. Hero feature.** |
| 3 | **On-device browser-extension automation** — fills forms / drives flows as the user, in their own session; PII stays local | none — runs locally, no server | **Yes, as a roadmap track. The real "on my behalf" unlock.** |
| 4 | Server-side agent / authorized-agent service | **full PII custody (honeypot)** | **No — by design.** This is the DeleteMe model we complement, not copy. |

### Rung 1 — the legitimate maximum without custody (v1)

The honeypot only triggers if **PII touches a server.** It does not if the work
happens **on the user's machine and the final action is the user's own
click/send.** So every finding ships with a prepared action:

- **Email-method brokers →** a `mailto:` that opens the user's mail client with
  the full deletion request *already drafted* (to, subject, body, identity
  fields filled in-memory). They hit send.
- **Web-form brokers →** opens the opt-out page with the request text on the
  clipboard and a step overlay: paste-and-submit, not hunt-and-figure-out.
- **Mail-only brokers →** a printable, pre-filled letter.

This is the product's spine: **we do ~95% of the work; the user provides the
final keystroke that keeps the data theirs.** It is "on your behalf" minus one
deliberate click, and that click is the entire privacy guarantee.

### Rung 2 — California DROP is an actual removal button

The DELETE Act's **DROP** platform (consumer-accessible Jan 2026; broker
deletion mandatory Aug 1 2026) is a **single request that propagates to every
registered data broker, who are legally obligated to delete and to keep deleting
every 45 days, including newly collected data.** It is the closest thing that
exists to "scour and remove," it is state-operated (so *we* hold nothing), and
it is enforceable. For California residents this genuinely is the removal tool
users imagine. **The app's job: drive them into it, pre-fill it, track it.**
Treat DROP as a centerpiece, not a footnote — gated on the user's state (see the
state-aware jurisdiction note in [03](03-architecture.md) / [04](04-data-model.md)).

### Rung 3 — the browser extension (roadmap)

A client-side extension can *genuinely act* — fill forms, click through flows,
drive the opt-out — while every piece of PII stays **on the user's own machine,
running as the user, in their own session. No server ever sees it.** Same trust
model as a password manager. This is the architecture that squares "the tool did
it for me" with "the tool stored nothing about me."

- **Costs / honest limits:** more build effort; per-broker brittleness; CAPTCHAs
  and email-verification loops will still stop full automation cold on some
  brokers (the extension hands those back to the user as a Rung-1 action).
- **Sequencing:** gated behind the static MVP. The static site is the product;
  the extension is the automation upgrade that preserves the no-custody
  guarantee. See [07](07-roadmap.md), milestone **M6**.

### Rung 4 — what we deliberately will *not* build

A server that holds PII and submits on the user's behalf, or an
authorized-agent service. The fully-automated experience *exists* via the paid
services; it only exists because they took the custody shortcut. We **complement
and contrast** them (honest neutral mention, no affiliate links) and occupy the
no-custody niche instead.

## The design rule this produces: no dead-end findings

The thing that makes a results screen feel useless is a finding you can't act
on. So this is a **hard product rule, not a nice-to-have:**

> **Nothing enters the findings/remediation queue unless it carries an attached
> action (a verb). Truly immutable, zero-action exposures are demoted to a
> short "monitor — can't remove" footnote; they never sit in the queue
> masquerading as a task the user failed to complete.**

Almost nothing is genuinely actionless once you look:

| "Permanent" exposure | Attached action |
|----------------------|-----------------|
| Breach-dump hit | Rotate this password → link; check reuse → password breach check |
| Archive.org / Wayback copy | Their content-removal request process |
| Google cache / search result | Source removal + Google "Results about you" |
| Court / legal name-change record | Sealing / confidentiality petition info where the state offers it |
| Data already propagated to scrapers | Suppress at source + re-check cadence; honest "monitor" footnote if nothing else |

Only when there is *truly* no action does the item become a monitoring footnote
— surfaced honestly, never as a task. This rule is what lets the tool show a
user their real exposure **without** handing them a list of things they can do
nothing about.

## How this reframes the product's promise

The README framing moves from **"remove any reference to your deadname"**
(unachievable — breach dumps, archives, caches, and non-complying third parties
are permanent) to **"find your exposure and reduce/manage it, doing as much of
the work for you as we can without ever holding your data."** That is the honest,
deliverable promise, and Rungs 1–3 + the no-dead-end rule are how we keep it
from feeling like a checklist.
