# 08 — Open Questions for the Requester

Decisions or assumptions that should be confirmed before/early in build.
Resolved-this-session items are noted so the record is complete.

## Resolved this session
- **Repo:** the tool gets its **own dedicated repo**. (Automated creation was
  blocked by the integration's permissions, so scope docs landed in
  `morgancollado/morgan-collado` under `/scope/` for now — extract later.)
- **Breach check:** **stateless serverless proxy** for email checks; password
  check stays client-side.
- **Proxy operation (revised — privacy route):** the **default email path is the
  deep-link**, which routes the user through **no project infrastructure**.
  Self-hosted proxy and the project's shared OHTTP-fronted proxy are **explicit
  opt-ins**, each behind an honest explanation. We reversed the earlier
  "shared proxy as default" call because defaulting a high-risk population into
  project-operated infrastructure contradicts the safety premise (see
  [03](03-architecture.md) Decision 2, [06](06-risk-register.md) R2/R16). Q2
  below is reframed accordingly.
- **i18n/jurisdiction:** **US *and* Colombia** are in scope; language is
  decoupled from jurisdiction (`es-US` ≠ `es-CO`).

## Still open

1. **Final repo name & visibility.** Proposed: **`self-audit-toolkit`**,
   **public** (open-source/self-hostable is a non-negotiable). Confirm name and
   that public is intended from day one (vs. private until M2).

2. **The HIBP proxy — confirm the privacy-route default, and who (if anyone) runs
   a shared instance.** **Revised decision:** the **deep-link is the default**
   (no project infra in the path); **self-hosted proxy** is the integrated
   opt-in; the **project's shared OHTTP proxy** is an *additional* opt-in only.
   Two things still need a call: **(a)** confirm you're happy trading the
   out-of-box integrated experience for the conservative default (I recommend
   yes for this population); **(b)** *if* we offer the shared OHTTP rung at all,
   **who operates the relay vs. the gateway?** OHTTP's guarantee holds only if
   they are **separate, non-colluding parties** — if the project runs both, the
   structural guarantee collapses to "trust me." Name an independent relay
   operator or drop the claim. BYO-key-direct-from-browser remains **not viable**
   (HIBP CORS + `User-Agent`, verified). See [03](03-architecture.md) Decision 2
   and R2/R16 in [06](06-risk-register.md).

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

## New (from the stress-test pass)

9. **State-aware jurisdiction depth.** v1 models US jurisdiction as `country` +
   `region` (state) because rights are sub-national. Which states do we fill in
   first (CA is mandatory for DROP; which others — TX, FL, NY…)? And we must
   commit to **never implying CCPA-style rights to a user whose state lacks
   them.** Confirm this is the right call vs. a coarser "US" with caveats.

10. **Browser-extension appetite (M6).** The roadmap adds an on-device extension
    as the real "on your behalf" automation that *keeps custody on the user's
    machine*. Confirm you want this as a post-v1 track (large, brittle), and the
    target browsers (Chromium + Firefox?).

11. **Legal review for the name-change / court-record flow.** This is now
    first-class content (often the biggest, most permanent deadname source) and
    includes sealed-petition routes that vary by state. Who reviews it for
    accuracy before release (same gate as R4/R11)?

12. **Dual-use stance (R15).** The Discover flow is also a doxxing recipe. Are
    you comfortable with the mitigation (self-audit framing; declining to spell
    out the most operational targeting steps; no "look someone else up"
    affordance), and is that an acceptable, documented residual?

13. **Encrypted export default (R14).** Confirmed design: backups are
    **passphrase-encrypted by default**, plaintext only as a warned opt-out.
    Confirm you accept the small UX cost (a passphrase prompt) for this data.

## Items tagged `[VERIFY]` during research
None outstanding — the load-bearing facts were verified this session:
- HIBP: Pwned Passwords range is keyless/k-anonymous; **email search (incl.
  k-anonymity mode) requires an API key** → justifies the proxy.
- HIBP: **CORS is allowed only for non-authenticated APIs**; key'd endpoints
  must not be called client-side and require a `User-Agent` browsers can't set
  cross-origin → a proxy is unavoidable for integrated email checks, even with a
  user's own key (verified against HIBP API docs).
- **BADBOL license = CC BY-NC-SA 4.0.**
- **California DROP** live 2026 (broker compliance mandatory Aug 1 2026).
- Workshop origin (Imani Thompson, *Cache Me Outside* / *"404: Deadname Not
  Found"*) verified via 404 Media.
- Colombia: Ley 1581 de 2012 + SIC complaint path (consulta/reclamo, 10
  business days, exhaust-then-escalate) confirmed at a summary level; **detailed
  CO procedures still need local legal review before release.**
