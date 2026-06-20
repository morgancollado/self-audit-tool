# 11 — Brand: **Errata**

The product is named **Errata**. This document is the brand sheet — the name
rationale, wordmark, palette (WCAG-AA pairs), type, voice, and how the name
itself does safety work.

## Why "Errata"

*Errata* is the printing term for **a published list of corrections to a work** —
"the record went out wrong; here is the correction." That single word reframes
the entire product:

- **From shame to clerical fact.** The deadname is treated as a **publishing
  error in the public record, not a secret to be hidden.** The user isn't
  "scrubbing something embarrassing"; they're **correcting the record** — a
  posture of authority and dignity. This reframe is the brand's whole job: it
  raises the *desire* to use the tool by removing the flinch.
- **Calm and literate**, never alarmist — matches the trauma-informed tone bar.
- **Deniable-in-a-tab (a safety feature, not just style).** Errata may sit in a
  browser tab, history list, or home screen on a shared or watched device. The
  name reveals **nothing** about what it does — no "deadname," no "doxxing," no
  tell that could out the user to someone glancing over their shoulder. A
  discreet name is part of the threat model (see [06](06-risk-register.md) R3),
  not a cosmetic choice.

**Tagline:** *Correct the record.*

**Trademark/availability caveat:** "errata" is a common English word, which is
good for deniability but means the literal `.com` and some handles are likely
taken. Run a domain + app-store + trademark check before locking the wordmark;
fall back to a qualified domain (e.g. `errata.app`, `geterrata.*`,
`errata.tools`) if needed. The *product name* can stand even if the domain is
qualified. (Open repo/visibility item: [08](08-open-questions.md) Q1.)

## Wordmark & mark

- **Wordmark:** lowercase **`errata`** in a warm humanist serif, generous
  letter-spacing. Lowercase keeps it unintimidating and contemporary.
- **Mark:** a **proofreader's caret** (‸) — the editor's "insert the correction
  here" symbol — or a name shown **struck through once and rewritten** beneath/
  beside it (the literal gesture of the product). The caret is the favored
  standalone glyph: small, quiet, instantly "editorial."
- **Never** a redaction bar as the primary mark — black bars read as
  censorship/erasure; Errata is about *correction*, and the caret carries that.

## Palette (calm editorial; WCAG 2.1 AA verified pairs)

The register is **paper-and-ink**, not dashboard-neon. One restrained accent —
a proofer's red — used **only** on the correction gesture, **never** as alarm.

| Token | Hex | Role | AA pairing |
|-------|-----|------|------------|
| `ink` | `#1B1B1A` | primary text | on `paper`/`cream` → ✅ (>15:1) |
| `paper` | `#FBFAF7` | primary background | — |
| `cream` | `#F2EEE6` | raised surfaces / cards | `ink` on `cream` → ✅ (>13:1) |
| `slate` | `#4A4F57` | secondary text | on `paper` → ✅ (~8:1) |
| `proof` | `#B23A2E` | the correction mark **only** | `proof` on `paper` → ✅ (~5.2:1) for text/icon |
| `marker` | `#2F5D62` | links / primary action (calm teal) | on `paper` → ✅ (~6:1) |
| `marker-ink`| `#0F2A2D` | text on `marker` buttons | on `marker` → ✅ (AA) |

- **Dark mode:** invert to a warm near-black `#15140F` paper with `#EDEAE2`
  ink; keep `proof` desaturated slightly (`#C75A4E`) to hold AA on dark.
- **No alarm-red anywhere except `proof`,** and `proof` is a *correction*
  signal, not a danger signal. Errors/destructive states use `slate` + an icon,
  not red panic.
- A faint queer nod is allowed via a subtle two-tone (`marker` teal +
  `proof`-adjacent warm) — **never** a literal rainbow.

## Type

- **Headings / wordmark:** a warm humanist **serif** (e.g. *Source Serif 4*,
  *Newsreader*, or *Spectral* — all open-licensed). Signals "editorial,
  trustworthy, human."
- **Body:** a highly legible humanist **sans** (*Inter*, *Source Sans 3*) at a
  comfortable reading size for non-technical users in distress.
- **Data / templates / tracker:** a **monospace** (*IBM Plex Mono*) for the
  "workshop" surfaces — broker steps, generated letters, the findings ledger.
  This is the visual cue that *this part is a working document.*
- All families open-licensed (self-host the fonts — **no Google Fonts CDN
  call**, per the no-phone-home rule, [02](02-features-moscow.md)).

## Voice & tone

Errata talks like a **calm, exacting copy editor who is on your side** — precise,
unhurried, never dramatic.

- **Do:** plain, second-person, present tense. *"Spokeo has a listing that shows
  your name history. Here's the correction request — copy it, then send."*
- **Do:** name the limits honestly (the no-dead-end rule, [09](09-removal-feasibility.md))
  without doom. *"This one can't be fully removed. Here's what reduces it."*
- **Don't:** urgency, fear, streaks, badges, "act now," scare statistics, or
  shame. No exclamation-driven copy.
- **Reframe vocabulary** to the editorial metaphor where it helps:
  - findings = **"the record"** / entries in your **ledger**
  - a generated opt-out = **"a correction"** (you send)
  - resolved = **"corrected"**; can't-remove = **"noted — monitor"**
  - the deadname = **"the old entry"** (never "your shameful past name")

## Phase & surface naming

Keep the functional phase names **Discover** and **Remediate** in the IA, but the
*surfaced* labels wear the editorial coat:

| Function | Surfaced label | Note |
|----------|----------------|------|
| Phase 1 — Discover | **Read the record** | find what's published about you |
| Phase 2 — Remediate | **Make corrections** | send opt-outs, harden, remove |
| Findings log | **Your ledger** | the local, private list ([04](04-data-model.md)) |
| Opt-out generator | **Draft a correction** | prepared in-memory; you press send |
| California DROP | **File one correction for all** | the hero removal path |
| Panic-delete | **Clear the desk** | instant wipe; honestly scoped |

(Surface labels are a starting point, not locked — they should be usability-
tested with the M0 co-design group, [07](07-roadmap.md).)

## What the brand must never become

- A "scary hacker / dark-web" aesthetic (neon-on-black, glitch). Errata is a
  bright, quiet desk, not a war room.
- Gamified (no progress streaks, confetti, badges) — [02](02-features-moscow.md).
- Rainbow-washed. Dignity over flag-waving.
- Anything that, seen on screen, tells a bystander what the user is doing.
