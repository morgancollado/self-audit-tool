# 08 — Open Questions for the Requester

Decisions or assumptions that should be confirmed before/early in build.
Resolved-this-session items are noted so the record is complete.

## Resolved this session
- **Repo:** the tool gets its **own dedicated repo**. (Automated creation was
  blocked by the integration's permissions, so scope docs landed in
  `morgancollado/morgan-collado` under `/scope/` for now — extract later.)
- **Breach check:** **stateless serverless proxy** for email checks; password
  check stays client-side.
- **i18n/jurisdiction:** **US *and* Colombia** are in scope; language is
  decoupled from jurisdiction (`es-US` ≠ `es-CO`).

## Still open

1. **Final repo name & visibility.** Proposed: **`self-audit-toolkit`**,
   **public** (open-source/self-hostable is a non-negotiable). Confirm name and
   that public is intended from day one (vs. private until M2).

2. **Who runs the HIBP proxy, and on whose key?** Options: (a) the project
   operates one shared proxy on a maintainer's HIBP subscription (cost +
   you're the trusted operator); (b) ship the proxy code and have each
   self-hoster bring their own key; (c) default to deep-link, proxy strictly
   opt-in/self-hosted. **Recommendation: (c) + (b)** — no shared key to fund or
   trust; deep-link works out of the box.

3. **Colombia scope depth.** Colombia-only, or is broader LatAm expected later?
   And **do you have access to local legal review** for the CO content (gates
   M5 per Risk R11)? If not, who reviews it?

4. **Hosting choice.** Recommendation: **Cloudflare Pages** for the app
   (+ Worker for the optional proxy). Confirm, or prefer GitHub Pages / Netlify
   / Vercel. (Note: Vercel is fine technically, but keep this project's
   analytics off — unlike the portfolio.)

5. **Commercial-alternative links.** Should we honestly link to paid services
   (DeleteMe/Optery) as the "pay someone" path? **No affiliate links** either
   way (would conflict with no-dark-patterns). Default: a neutral mention, no
   links, unless you want otherwise.

6. **Encrypted export.** Is a passphrase-encrypted backup wanted (vs. plaintext
   JSON with a warning)? Currently a **Could** for later.

7. **Name retention default.** Confirmed design: storing the user's
   name/deadname is **off by default**. Confirm you're comfortable that the
   convenience of pre-filled templates is opt-in only.

8. **Donor/funding model, if any.** The tool is free/DIY by design. If any
   sustaining model is ever wanted, note that BADBOL's **NonCommercial** data
   license would constrain a paid offering built on that data.

## Items tagged `[VERIFY]` during research
None outstanding — the load-bearing facts were verified this session:
- HIBP: Pwned Passwords range is keyless/k-anonymous; **email search (incl.
  k-anonymity mode) requires an API key** → justifies the proxy.
- **BADBOL license = CC BY-NC-SA 4.0.**
- **California DROP** live 2026 (broker compliance mandatory Aug 1 2026).
- Workshop origin (Imani Thompson, *Cache Me Outside* / *"404: Deadname Not
  Found"*) verified via 404 Media.
- Colombia: Ley 1581 de 2012 + SIC complaint path (consulta/reclamo, 10
  business days, exhaust-then-escalate) confirmed at a summary level; **detailed
  CO procedures still need local legal review before release.**
