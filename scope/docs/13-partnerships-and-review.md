# 13 — Partnerships & Review (outreach targets)

Three external relationships gate quality and trust and have **long lead times**,
so start them in parallel with M0. None are endorsements or confirmed contacts —
they're researched starting points; verify each org's current programs and
capacity before relying on them.

---

## A. Legal review (gates name-change content @ M2, Colombia @ M5 — R4/R11, Q11)

We need someone with real expertise to review the legal-name-change /
court-record content and the state rights framing before general release.

**US — best-fit first:**
- **Transgender Legal Defense & Education Fund (TLDEF)** — runs the **Name Change
  Project** (pro bono legal help for trans name changes). *The* most on-point
  partner for the name-change/court-record flow; they live this content daily.
- **Advocates for Trans Equality (A4TE)** — formed from the 2024 NCTE+TLDEF
  merger; national policy + legal expertise across states.
- **Lambda Legal**, **National Center for Lesbian Rights (NCLR)**, **ACLU LGBTQ
  & HIV Project** — national LGBTQ legal orgs; good for state-rights review and
  the harder "platform/regulator resists" escalation content.
- **Law-school clinics** — many have LGBTQ-rights or name-change clinics; a clinic
  partnership can give sustained, low-cost per-state review (and gives students
  real work). Worth a targeted email to a few clinic directors.

**Colombia (gates M5):**
- **Fundación Karisma** — Colombian digital-rights org; strong on *habeas data* /
  Ley 1581 and digital privacy. Best fit for the data-protection angle.
- **Colombia Diversa** — leading Colombian LGBTQ-rights org; **Fundación GAAT**
  (Grupo de Acción y Apoyo a personas Trans) — trans-specific.
- **Dejusticia** — rights-focused think tank with data-rights work.

**How to approach:** lead with the mission and the gating ask ("we will not ship
legal content without expert review; would you review N pages, or point us to who
should?"). Offer co-credit. Until reviewed, content ships behind the
"verify locally" banner ([07](07-roadmap.md) M2).

---

## B. Community co-design (gates M0 — trauma-informed design, R10)

Validate the threat model, tone, and flows **with** the people Errata serves
before building UI.

- **Imani Thompson** — runs the *Cache Me Outside* / *"404: Deadname Not Found"*
  self-doxxing workshops that directly inspired Errata ([00](00-prior-art.md)).
  **First call:** credit the lineage and invite collaboration/co-design.
- **Digital Defense Fund** — digital security for communities facing
  surveillance/targeting; deep threat-modeling experience with at-risk users.
- **CryptoHarlem (Matt Mitchell)** — digital security for over-surveilled,
  especially Black, communities — directly relevant to "trans people of color"
  as the priority population.
- **Hacking//Hustling** — digital safety with sex workers and marginalized people;
  strong on real-world adversary models.
- **Local LGBTQ centers / trans mutual-aid groups** — for paid, compensated
  usability sessions (compensate participants — non-negotiable for this work).
- **Trans Lifeline** — already a footer resource; a community touchpoint, not a
  design lab.

**How to approach:** small, paid, consent-driven sessions; never extract trauma
for free. Ask what would make them *not* trust the tool — that's the most
valuable input.

---

## C. Independent security / privacy review (gates public launch — adds to R6/R8/R9)

The risk register is not a substitute for outside eyes. Add an external review as
a milestone gate between M2 and the public v1.

- **Open Technology Fund (OTF) — Security Lab / Red Team Lab** — provides **free**
  security audits, red-teaming, and usability-of-security reviews for
  open-source tools serving at-risk users. **Primary target**; Errata is squarely
  in scope. (OTF also has funding programs — relevant to Q8.)
- **Cure53** — privacy/appsec audits, frequently the firm behind OTF-funded
  reviews; pentest + code review of exactly this shape of app.
- **Radically Open Security** — nonprofit-friendly Dutch firm; civil-society work.
- **Trail of Bits / NCC Group / Include Security** — strong commercial appsec if
  budget exists; overkill for a static app but excellent for the proxy + crypto
  (export encryption) review.
- **Citizen Lab (U. Toronto)** — research on targeted threats to civil society;
  better as advisors/threat-intel than as a code auditor.
- **Access Now Digital Security Helpline** — already a footer resource; can advise
  and triage, and is a good sanity-check relationship.

**Scope the review at:** the CSP/no-egress claims, the storage/wipe/ephemeral
guarantees, the export encryption, and the optional breach proxy. Publish the
report (transparency is part of the trust model).

---

## Sequencing

| Relationship | Start | Gates |
|--------------|-------|-------|
| Co-design (Imani Thompson + 1–2 community orgs) | **now, before UI** | M0 |
| Legal review (TLDEF / clinic) | **now** (long lead) | M2 release |
| Security review (OTF Security Lab) | by **M2** | public v1 |
| CO legal review (Karisma / Colombia Diversa) | before M5 | M5 release |

> Funding note (Q8): OTF and similar also offer **grants** — a security audit
> relationship can double as a sustaining-funding lead without taking on the
> NonCommercial-incompatible paid model.
