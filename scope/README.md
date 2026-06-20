# Errata — Scoping Documents

> **Status: M0 in progress.** This `scope/` directory holds the planning
> artifacts for **Errata**; the first implemented foundations (CSP, content
> schema, staleness reporting) now live at the repo root — see
> [`docs/12-app-foundations.md`](docs/12-app-foundations.md). See
> [`docs/08-open-questions.md`](docs/08-open-questions.md) for decisions still
> open, [`docs/11-brand.md`](docs/11-brand.md) for name/look/voice, and
> [`docs/13-partnerships-and-review.md`](docs/13-partnerships-and-review.md) for
> the legal/co-design/security-review outreach.

## What this is

A guided, **client-side-only** web tool that helps a person find and
**reduce/manage** their own online exposure, with particular attention to
**deadname exposure** for trans and gender-nonconforming people. It walks a user
through two phases — **Discover** (find your exposure the way a hostile actor
would) and **Remediate** (opt-out requests, platform hardening, breach checks,
and deadname-specific removals) — keeping all progress in the browser, with no
account and no server-side storage of user data.

> **Honest scope of the promise.** This tool helps you **find and reduce** your
> exposure; it cannot **"remove every reference"** to a deadname, because breach
> dumps, web archives, search caches, and non-complying third parties are
> effectively permanent. The deliverable promise is: *find your exposure, and do
> as much of the removal work for you as possible **without ever holding your
> data.*** Where the work can't be finished, we say so and route to
> harm-reduction — we never surface a dead-end. See
> [`docs/09-removal-feasibility.md`](docs/09-removal-feasibility.md).

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
   licenses, old bylines, data-broker records, platform name-removal paths, and
   **public legal name-change / court records**) are the point. If the scope
   drifts into a general privacy guide, it has failed.

## Two product principles (govern every feature)

These sit alongside the safety architecture and decide how features feel:

- **We do ~95% of the work; the user provides the final keystroke.** The
  honeypot only triggers if PII touches a server. So every removal action is
  *prepared in-memory* — pre-filled `mailto:`, form text on the clipboard,
  printable letter — and the user presses send. That last click is the entire
  privacy guarantee. This is the legitimate maximum of automation *without
  custody*; full hands-off removal would require holding user data, which we
  refuse. See [`docs/09-removal-feasibility.md`](docs/09-removal-feasibility.md).
- **No dead-end findings (the attached-action rule).** Nothing enters the
  findings/remediation queue unless it carries an action (a verb). Truly
  immutable exposures (e.g. breach dumps) are demoted to a short "monitor —
  can't remove" footnote with whatever harm-reduction *does* apply — never
  listed as a task the user failed to finish. The tool must show real exposure
  **without** handing a distressed user a list of things they can do nothing
  about.

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
> impossible to do client-side without leaking an API key, so an *optional* thin
> **stateless, log-free** serverless proxy exists for it, physically isolated
> from the static app. **By default the email check is a deep-link that routes
> the user through no project infrastructure at all** (privacy route); a
> **self-hosted** proxy is the integrated opt-in. A project-operated shared proxy
> is **not shipped in v1.** The password (k-anonymity) breach check stays
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
> repo when it exists. **Product name: Errata** (calm, literate, and
> deniable-in-a-tab — see [`docs/11-brand.md`](docs/11-brand.md)); proposed repo
> slug **`errata`** (confirm domain/trademark and visibility — [`docs/08-open-questions.md`](docs/08-open-questions.md) Q1).

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
| 09 | [Removal feasibility](docs/09-removal-feasibility.md) | The automation ceiling; the 95%/no-custody rule; DROP hero feature; extension track; no-dead-end rule |
| 10 | [Stress-test findings](docs/10-stress-test-findings.md) | Edge cases surfaced in the stress-test pass and where each was folded in |
| 11 | [Brand: Errata](docs/11-brand.md) | Name rationale; wordmark; AA palette; type; voice; phase labels; deniability-as-safety |
| 12 | [App foundations (M0)](docs/12-app-foundations.md) | Implemented: CSP nonce/hash strategy, content JSON schema + no-dead-end gate, staleness reporting |
| 13 | [Partnerships & review](docs/13-partnerships-and-review.md) | Outreach targets: legal review, community co-design, independent security review |

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
