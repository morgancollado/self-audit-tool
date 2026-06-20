# Self-Audit Toolkit — Scoping Documents

> **Status: scoping only.** This directory contains the planning artifacts for a
> proposed tool. No application code lives here yet. See
> [`docs/08-open-questions.md`](docs/08-open-questions.md) for decisions still
> open with the requester.

## What this is

A guided, **client-side-only** web tool that helps a person find and reduce
their own online exposure, with particular attention to **deadname exposure**
for trans and gender-nonconforming people. It walks a user through two phases —
**Discover** (find your exposure the way a hostile actor would) and
**Remediate** (opt-out requests, platform hardening, breach checks, and
deadname-specific removals) — keeping all progress in the browser, with no
account and no server-side storage of user data.

It productizes the spirit of in-person "self-doxxing" workshops in the trans
community — verified directional inspiration: Imani Thompson's **Cache Me
Outside / "404: Deadname Not Found"** events, covered by 404 Media, which
red-team a participant's own footprint and then lock it down. The core insight
we preserve: **discovery before remediation** — you can't fix exposure you
can't see.

## Who it serves (and why that governs everything)

Primary users are **trans and nonbinary people, with emphasis on trans people
of color**, doing digital self-defense against doxxing, deadname exposure, and
targeted harassment — a population that is simultaneously under-served and
over-surveilled. Two consequences:

1. **The tool must never become a liability.** A self-audit tool that logged
   what a user searched for — their deadname, accounts, location — would be a
   catastrophic honeypot if breached or subpoenaed. The architecture *is* the
   safety feature.
2. **The deadname dimension is the differentiator.** This is not a generic
   privacy checklist with a rainbow on it. Trans-specific exposure surfaces
   (deadnames on legacy accounts, school/university records, professional
   licenses, old bylines, data-broker records, platform name-removal paths)
   are the point. If the scope drifts into a general privacy guide, it has
   failed.

## Non-negotiable safety architecture

These are product constraints, not suggestions. Exactly **one** has been
consciously relaxed (the breach-check proxy); that relaxation is documented and
isolated. See [`docs/06-risk-register.md`](docs/06-risk-register.md).

- **No server-side storage of any user data.** Target: a static app with all
  state in `localStorage` / `IndexedDB`.
- **No accounts, no login, no email/phone collection, no third-party auth.**
- **No analytics, no trackers, no third-party scripts that phone home** —
  including "privacy-friendly" analytics. None.
- **Panic-delete:** one obvious control that instantly wipes all local state.
- **Shared-device safety:** an ephemeral/session mode that persists nothing,
  plus clear warnings about shared/monitored devices.
- **No dark patterns, no urgency manipulation, no engagement mechanics.**
- **Open-source, clearly licensed, self-hostable, ideally runnable offline.**

> **The one documented exception:** in-app breach-check *by email* is
> impossible to do client-side without leaking an API key, so it routes through
> a thin **stateless, log-free** serverless proxy that is physically isolated
> from the static app and fully optional (the app degrades to a deep-link if
> the proxy is absent). The password (k-anonymity) breach check stays
> client-side. Rationale and guarantees: see the architecture and risk docs.

## Where this should live (repository recommendation)

The tool should be built in its **own dedicated, public repository** — not in
the author's portfolio repo (`morgancollado/morgan-collado`), which bundles
`@vercel/analytics` and `@vercel/speed-insights`, in direct conflict with the
no-tracker rule. A separate repo also gives a clean license, an open
contribution model for the broker/platform data, and an independent deploy
target.

> These scope docs were written into the portfolio repo under `/scope/` only
> because automated creation of a new repository was blocked by the
> integration's permissions during this session. Extract them to the dedicated
> repo when it exists. Proposed name: **`self-audit-toolkit`** (calm,
> non-alarming — final name is an open question).

## Document index

| # | Document | Purpose |
|---|----------|---------|
| — | [README](README.md) | This overview + safety constraints |
| 00 | [Prior art & data sources](docs/00-prior-art.md) | What exists; reuse vs link vs complement; data backbone + license |
| 01 | [MVP definition](docs/01-mvp.md) | Smallest version with real value; v1 includes / excludes |
| 02 | [Feature breakdown (MoSCoW)](docs/02-features-moscow.md) | Prioritized features across both phases |
| 03 | [Architecture](docs/03-architecture.md) | Next.js structure, state, content-as-data, hosting, i18n, PWA, the 6 hard decisions |
| 04 | [Client-side data model](docs/04-data-model.md) | What's stored, in what shape; export/import/wipe/ephemeral |
| 05 | [Content sourcing & maintenance](docs/05-content-sourcing.md) | Data freshness without a backend; multi-jurisdiction |
| 06 | [Risk register](docs/06-risk-register.md) | Privacy/security/legal risks + mitigations; the proxy decision |
| 07 | [Roadmap](docs/07-roadmap.md) | Solo-dev milestones |
| 08 | [Open questions](docs/08-open-questions.md) | Assumptions needing the requester's confirmation |

## License stance (recommended)

- **Code:** a permissive OSI license (MIT or Apache-2.0) so the tool is freely
  self-hostable and forkable.
- **Content/data:** likely **CC BY-NC-SA 4.0** if any of it derives from the
  Big-Ass Data Broker Opt-Out List (which is CC BY-NC-SA). Keep code and data
  licensed separately so the data's ShareAlike/NonCommercial terms don't
  encumber the code. See [`docs/00-prior-art.md`](docs/00-prior-art.md).

## Trauma-informed & accessibility baseline

Plain, calm language; no fear-mongering; optional content warnings before
discovery steps; **WCAG 2.1 AA**; full keyboard navigation; screen-reader
friendly; user moves at their own pace; reading level appropriate for
non-technical users in distress.
