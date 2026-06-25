# Broker opt-out capture aid

A **maintainer tool**, not part of the app or CI. It opens each remaining
depth-first target broker's opt-out page in a real browser **on your machine /
residential connection** — the verification the build sandbox can't do (its egress
proxy blocks Chromium, and broker WAFs 403 datacenter/headless clients). See
[`scope/docs/14-broker-coverage-runbook.md`](../../scope/docs/14-broker-coverage-runbook.md)
for the full process and the per-broker safety-field judgment calls.

## Run

From the repo root, on your own machine:

```bash
npx playwright install chromium        # one-time: fetch the browser
node tools/broker-capture/capture.mjs  # headed; solve any CAPTCHA, press Enter to capture each
```

Unattended (skips prompts; won't solve CAPTCHAs):

```bash
node tools/broker-capture/capture.mjs --auto --dwell=6000
```

Re-run just the ones that walled or errored:

```bash
node tools/broker-capture/capture.mjs --only=radaris,mylife,nuwber
```

## Output (`./broker-captures/`)

- `<slug>.png` — full-page screenshot of each opt-out page.
- `captures.json` — `{ slug, name, requestedUrl, finalUrl, status, title,
  wallDetected, text }` per broker (written incrementally).

`find: true` brokers had a drifted URL at last check — confirm the **current**
opt-out URL in the browser; `finalUrl` will capture where you actually landed.

## Then

Send `captures.json` (and any screenshots for the ambiguous ones) back, and it
becomes validated `content/brokers/us/<slug>.json` — with the safety fields
(`optOutExposesLinkage`, `requiresId`, `leaveItGuidance`) decided from what the
pages actually show. The tool captures pages; **you/we make the R13 judgment** the
page can't.

## Notes

- Nothing here touches the app build, the content gates, or runtime — it imports
  Playwright (already a devDependency) and writes only to `./broker-captures/`.
- `broker-captures/` is git-ignored; screenshots can contain a test search and
  shouldn't be committed.
