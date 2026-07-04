#!/usr/bin/env node
// Browser smoke test: prove the STATIC EXPORT actually runs under its own
// enforced Content-Security-Policy. A successful `next build` and "hashes were
// injected" are NOT proof the app works — the scripts still have to load and
// React still has to hydrate under the CSP. This is the gate that would have
// caught the strict-dynamic self-block (the framework chunks being refused,
// leaving a dead, un-hydrated shell with an inert panic button).
//
// We serve ./out with ONLY the <meta> CSP applied (no _headers) — the
// "any static host / fully offline" case the export explicitly targets and the
// strictest realistic delivery. Then, in real Chromium, we assert:
//   1. zero CSP violations and zero blocked scripts,
//   2. the app HYDRATED (left the SSR "Loading…" shell for real content),
//   3. first load leaves NO durable trace before consent — no IndexedDB
//      database is created and persistence is not granted until the user opts in.
//
// Run: npm run test:csp   (builds the static export first, then this)

import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const OUT = 'out';
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

function fail(msg) {
  console.error(`[csp-smoke] FAIL — ${msg}`);
  process.exitCode = 1;
}

// Accessibility scan for a loaded route. We fail the gate on the structural a11y
// axe can prove — missing labels/names, invalid ARIA, duplicate ids, AND
// color-contrast — at serious/critical impact, which is exactly what the M2 form
// surfaces must get right. (The design tokens are additionally pinned to AA by
// lib/design/contrast.test.ts; keeping color-contrast in the live scan catches a
// regression in a specific rendered pairing the token math doesn't enumerate.)
// Only the structural landmark rules the root-layout shell owns are excluded.
const AXE_IGNORE = new Set(['region', 'landmark-one-main', 'page-has-heading-one']);
async function axeFailures(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = violations.filter(
    (v) => !AXE_IGNORE.has(v.id) && (v.impact === 'serious' || v.impact === 'critical'),
  );
  if (serious.length) {
    for (const v of serious.slice(0, 12)) console.error(`    • [${label}] ${v.id} (${v.impact}): ${v.help}`);
    fail(`${label} has ${serious.length} serious/critical accessibility violation(s).`);
  } else {
    console.log(`[csp-smoke] ${label}: no serious/critical axe violations.`);
  }
}

if (!existsSync(join(OUT, 'index.html'))) {
  console.error(`[csp-smoke] No ./${OUT}/index.html. Run \`npm run build:static\` first.`);
  process.exit(1);
}

// Static server that deliberately does NOT honor _headers, so the <meta> CSP is
// the only policy in force (the offline / dumb-host scenario).
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let fp = join(OUT, p);
  if (existsSync(fp) && statSync(fp).isDirectory()) {
    // A locale root like /en is BOTH a directory (out/en/...) and a page
    // (out/en.html) — prefer the directory index, fall back to the sibling file.
    const idx = join(fp, 'index.html');
    fp = existsSync(idx) ? idx : fp + '.html';
  }
  // Clean-URL fallback (/en/discover -> en/discover.html), as static hosts serve.
  if (!existsSync(fp) && existsSync(fp + '.html')) fp = fp + '.html';
  if (!existsSync(fp)) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('Content-Type', TYPES[extname(fp)] || 'application/octet-stream');
  res.end(readFileSync(fp));
});

await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

// ERRATA_CHROMIUM: optional path to a system Chromium, for sandboxes where the
// Playwright-managed download isn't available. Unset = Playwright's default.
const browser = await chromium.launch({ headless: true, executablePath: process.env.ERRATA_CHROMIUM || undefined });
try {
  // An explicit context (not browser.newPage()) so AxeBuilder can scan this
  // page too — it refuses pages born from the browser's default context.
  const landingCtx = await browser.newContext();
  const page = await landingCtx.newPage();
  const blockedScripts = [];
  page.on('requestfailed', (r) => {
    if (r.failure()?.errorText?.includes('csp')) blockedScripts.push(r.url().replace(base, '/'));
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI || 'inline'}`);
    });
  });

  // '/' is the client-side language chooser (no middleware in the static
  // export); with no stored preference and an English browser it must forward
  // to /en. This exercises the chooser's own script under the CSP.
  await page.goto(base, { waitUntil: 'networkidle' });
  try {
    await page.waitForURL('**/en', { timeout: 8000 });
  } catch {
    fail("the '/' language chooser did not forward to /en under the CSP.");
  }
  // Hydration: the SSR shell renders "Loading…"; it only becomes real content
  // once the client scripts run. Give it a bounded window to get there.
  let hydrated = true;
  try {
    // A phrase from the landing hero's supporting copy — present only after hydration.
    await page.getByText('correcting a publishing error', { exact: false }).waitFor({ timeout: 8000 });
  } catch {
    hydrated = false;
  }

  const probe = await page.evaluate(async () => {
    let dbs = [];
    try { dbs = (await indexedDB.databases()).map((d) => d.name); } catch { dbs = ['<error>']; }
    let persisted = null;
    try { persisted = await navigator.storage.persisted(); } catch { /* ignore */ }
    const main = (document.querySelector('#main')?.innerText || '').replace(/\s+/g, ' ').trim();
    return { violations: window.__csp || [], dbs, persisted, main };
  });

  console.log(`[csp-smoke] #main: ${JSON.stringify(probe.main.slice(0, 90))}`);
  console.log(`[csp-smoke] CSP violations: ${probe.violations.length}  blocked scripts: ${blockedScripts.length}`);
  console.log(`[csp-smoke] IndexedDB databases at first load: ${JSON.stringify(probe.dbs)}  persisted: ${probe.persisted}`);

  if (probe.violations.length || blockedScripts.length) {
    for (const v of probe.violations.slice(0, 12)) console.error(`    • ${v}`);
    for (const s of blockedScripts.slice(0, 12)) console.error(`    • blocked ${s}`);
    fail('the static export violates its own CSP (scripts refused).');
  }
  if (!hydrated || probe.main.includes('Loading')) {
    fail('the static export did not hydrate under the CSP (stuck on the SSR shell).');
  }
  // No durable trace may be written before the user consents on the safety intro.
  if (probe.dbs.length > 0) {
    fail(`first load created IndexedDB database(s) before consent: ${JSON.stringify(probe.dbs)}.`);
  }
  if (probe.persisted === true) {
    fail('first load was granted persistent storage before consent.');
  }

  // The redesigned landing carries the most bespoke markup in the app (the
  // strikethrough hero, the DROP plate, footnotes) — scan it like every flow
  // route instead of leaving the front door unchecked.
  await axeFailures(page, '/ (landing)');

  // Legacy pre-i18n URLs: /discover (bookmarked before routes moved under
  // /en|/es) must forward to the locale route, not 404 on a returning user.
  await page.goto(base + 'discover', { waitUntil: 'networkidle' });
  try {
    await page.waitForURL('**/en/discover', { timeout: 8000 });
    console.log('[csp-smoke] legacy /discover forwarded to /en/discover.');
  } catch {
    fail('the legacy /discover route did not forward to /en/discover under the CSP.');
  }

  // ---- /discover: safety gate + deadname-query routing (M1 hardening) ----
  const dctx = await browser.newContext();
  const dpage = await dctx.newPage();
  await dpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await dpage.goto(base + 'en/discover', { waitUntil: 'networkidle' });

  // A fresh visitor deep-linking to /discover must hit the safety intro, NOT the
  // deadname inputs.
  let introGate = false;
  try {
    await dpage.getByText('Before you start').waitFor({ timeout: 8000 });
    introGate = true;
  } catch { /* intro not shown */ }
  const deadnameBefore = await dpage.getByLabel('Former name (deadname)').count();
  if (!introGate) fail('/discover did not show the safety intro for a fresh visitor (deep-link bypass).');
  if (deadnameBefore > 0) fail('/discover exposed the deadname input before the safety intro was acknowledged.');

  // Acknowledge (session-only) → the discover UI appears. Enter a deadname and
  // confirm every resulting "Run" link goes to DuckDuckGo, never Google.
  await dpage.getByRole('button', { name: /session-only/i }).click();
  await dpage.getByLabel('Former name (deadname)').waitFor({ timeout: 8000 });
  await dpage.getByLabel('Former name (deadname)').fill('Deadname McTest');
  await dpage.waitForTimeout(300);
  const runHrefs = await dpage.locator('a.query-run').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  const dviol = await dpage.evaluate(() => window.__csp || []);
  const toGoogle = runHrefs.filter((h) => h && h.includes('google.com'));
  console.log(`[csp-smoke] /discover: intro-gated=${introGate}, run links=${runHrefs.length}, →google=${toGoogle.length}`);
  console.log(`[csp-smoke] /discover first run link: ${runHrefs[0]}`);
  if (dviol.length) fail('/discover violated its CSP.');
  if (runHrefs.length === 0) fail('/discover produced no run links after a deadname was entered.');
  if (toGoogle.length > 0) fail(`a deadname "Run" link points at Google: ${toGoogle[0]}`);
  if (!runHrefs.every((h) => h && h.includes('duckduckgo.com'))) fail('a deadname "Run" link is not routed to DuckDuckGo.');
  await axeFailures(dpage, '/discover');
  await dctx.close();

  // ---- /remediate: safety gate + opt-out paradox default (M2) ----
  const rctx = await browser.newContext();
  const rpage = await rctx.newPage();
  await rpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await rpage.goto(base + 'en/remediate', { waitUntil: 'networkidle' });

  // Same deep-link rule as /discover: a fresh visitor meets the safety intro, not
  // the former-name input.
  let rIntroGate = false;
  try {
    await rpage.getByText('Before you start').waitFor({ timeout: 8000 });
    rIntroGate = true;
  } catch { /* intro not shown */ }
  const rDeadnameBefore = await rpage.getByLabel('Former name (deadname)').count();
  if (!rIntroGate) fail('/remediate did not show the safety intro for a fresh visitor (deep-link bypass).');
  if (rDeadnameBefore > 0) fail('/remediate exposed the former-name input before the safety intro was acknowledged.');

  // Acknowledge → enter a former name → the prepared requests must NOT contain it
  // by default (opt-out paradox, R13: the linkage is opt-in per broker).
  await rpage.getByRole('button', { name: /session-only/i }).click();
  await rpage.getByLabel('Former name (deadname)').waitFor({ timeout: 8000 });
  await rpage.getByLabel('Former name (deadname)').fill('Deadname McTest');
  await rpage.getByLabel('Current name', { exact: true }).fill('Alex Real');
  await rpage.waitForTimeout(300);
  const bodies = await rpage.locator('pre.optout-body').allInnerTexts();
  const rviol = await rpage.evaluate(() => window.__csp || []);
  const leaks = bodies.filter((b) => b.includes('Deadname McTest'));
  console.log(`[csp-smoke] /remediate: intro-gated=${rIntroGate}, prepared requests=${bodies.length}, leaking former name=${leaks.length}`);
  if (rviol.length) fail('/remediate violated its CSP.');
  if (bodies.length === 0) fail('/remediate produced no prepared requests after a name was entered.');
  if (leaks.length > 0) fail('a prepared opt-out request included the former name by default (opt-out paradox violated).');

  // INVERSE PARADOX (R13, both directions): mark the first broker's listing as
  // filed under the FORMER name. The request must then carry the former name (to
  // match the record) but must NOT disclose the current name unless opted in.
  const firstOptout = rpage.locator('section.optout').first();
  await firstOptout.getByRole('radio', { name: 'My former name' }).check();
  await rpage.waitForTimeout(200);
  const firstBody = await firstOptout.locator('pre.optout-body').innerText();
  console.log(`[csp-smoke] /remediate inverse-paradox body: ${JSON.stringify(firstBody.slice(0, 80))}`);
  if (!firstBody.includes('Deadname McTest')) {
    fail('a former-name listing did not key the request on the former name.');
  }
  if (firstBody.includes('Alex Real')) {
    fail('a former-name listing leaked the current name without opt-in (inverse opt-out paradox).');
  }

  // State-aware rights (M2): selecting California surfaces DROP; selecting a state
  // with different rights must NEVER show CCPA framing (the core sub-national
  // safety rule — implying rights a state doesn't grant is a real-world harm).
  await rpage.getByLabel('Your state').selectOption('CA');
  let caShowsDrop = false;
  try {
    await rpage.getByText('DROP', { exact: false }).first().waitFor({ timeout: 8000 });
    caShowsDrop = true;
  } catch { /* DROP not shown */ }
  await rpage.getByLabel('Your state').selectOption('TX');
  await rpage.waitForTimeout(300);
  const txText = (await rpage.locator('section.rights').innerText()).toUpperCase();
  const txLeaksCcpa = txText.includes('CCPA');
  console.log(`[csp-smoke] /remediate rights: CA→DROP=${caShowsDrop}, TX→shows CCPA=${txLeaksCcpa}`);
  if (!caShowsDrop) fail('selecting California did not surface DROP (the hero removal feature).');
  if (txLeaksCcpa) fail('a Texas user was shown CCPA framing (implies a right TX does not grant).');

  // A newly-authored comprehensive state (Oregon) surfaces its own law, not CA's.
  await rpage.getByLabel('Your state').selectOption('OR');
  await rpage.waitForTimeout(300);
  const orText = await rpage.locator('section.rights').innerText();
  if (!orText.includes('Oregon')) fail('selecting Oregon did not surface Oregon-specific rights.');
  if (orText.toUpperCase().includes('CCPA')) fail('an Oregon user was shown CCPA framing.');
  // A genuinely thin state (New York) shows the honest "no general deletion right"
  // card rather than implying a right that doesn't exist.
  await rpage.getByLabel('Your state').selectOption('NY');
  await rpage.waitForTimeout(300);
  const nyText = await rpage.locator('section.rights').innerText();
  if (!nyText.includes('New York')) fail('selecting New York did not surface its honest limited-rights note.');
  // Full coverage: a state with no comprehensive law (Alabama) now has its own
  // honest entry rather than the generic "no guidance yet" fallback.
  await rpage.getByLabel('Your state').selectOption('AL');
  await rpage.waitForTimeout(300);
  const alText = await rpage.locator('section.rights').innerText();
  if (!alText.includes('Alabama')) fail('Alabama has no authored rights entry (full coverage incomplete).');
  if (alText.includes('no verified guidance yet')) fail('Alabama still falls back to the generic note.');
  console.log('[csp-smoke] /remediate rights: OR→Oregon, NY→limited, AL→authored (full coverage)');

  // Quick pass (send-them-all): renders, lists the email-capable targets, and —
  // like everything on this page — never carries the former name.
  await rpage.locator('details.quicksend > summary').click();
  const quickRows = await rpage.locator('.quicksend-list li').count();
  const quickText = await rpage.locator('details.quicksend').innerText();
  console.log(`[csp-smoke] /remediate quick pass: ${quickRows} email target(s)`);
  if (quickRows === 0) fail('the quick pass listed no email-capable targets.');
  if (quickText.includes('Deadname McTest')) fail('the quick pass leaked the former name.');

  // Grouped tracking honesty (shared-backbone): tracking the BeenVerified-family
  // card must mark ONLY the representative sent and the siblings as re-check
  // to-dos — never a family-wide "sent" the data doesn't support.
  const bvCard = rpage.locator('section.optout', { hasText: 'BeenVerified family' }).first();
  await bvCard.getByRole('button', { name: /track it/ }).click();
  await rpage.waitForTimeout(300);
  const bvItem = rpage.locator('li.tracker-item', { hasText: 'BeenVerified family' }).first();
  const bvBadge = (await bvItem.locator('.stamp').innerText()).toLowerCase();
  const bvCovers = await bvItem.locator('p.name-inputs-note').innerText();
  console.log(`[csp-smoke] /remediate BV-family tracked: badge=${JSON.stringify(bvBadge)}`);
  if (bvBadge !== 'mixed') fail(`shared-backbone tracking shows '${bvBadge}', expected the mixed-state group badge.`);
  if (!bvCovers.includes('(sent)') || !bvCovers.includes('(to do)')) {
    fail('shared-backbone tracking did not record representative=sent + siblings=to-do.');
  }

  // Grouped tracking (single-submission): one click on the PeopleConnect card
  // tracks all six sites uniformly as sent.
  const pcCard = rpage.locator('section.optout', { hasText: 'PeopleConnect Suppression Center' }).first();
  await pcCard.getByRole('button', { name: /track it/ }).click();
  await rpage.waitForTimeout(300);
  const pcItem = rpage.locator('li.tracker-item', { hasText: 'PeopleConnect Suppression Center' }).first();
  const pcBadge = (await pcItem.locator('.stamp').innerText()).toLowerCase();
  const pcCovers = await pcItem.locator('p.name-inputs-note').innerText();
  const pcCovered = pcCovers.split(',').length;
  console.log(`[csp-smoke] /remediate PeopleConnect tracked: badge=${JSON.stringify(pcBadge)}, covers ${pcCovered} site(s)`);
  if (pcBadge !== 'sent') fail(`single-submission tracking shows '${pcBadge}', expected a uniform 'sent'.`);
  if (pcCovered < 6) fail(`the PeopleConnect group covers ${pcCovered} sites, expected 6.`);

  await axeFailures(rpage, '/remediate');

  // Atomic group removal (the lost-update regression: un-serialized writes left
  // 5 of 6 rows behind). Removing both groups must empty the tracker completely.
  await pcItem.getByRole('button', { name: 'Remove' }).click();
  await rpage.waitForTimeout(300);
  await bvItem.getByRole('button', { name: 'Remove' }).click();
  await rpage.waitForTimeout(300);
  const leftoverRows = await rpage.locator('li.tracker-item').count();
  console.log(`[csp-smoke] /remediate group removal: ${leftoverRows} tracker row(s) left`);
  if (leftoverRows !== 0) {
    fail(`removing both tracked groups left ${leftoverRows} row(s) behind (lost-update regression).`);
  }

  await rctx.close();

  // ---- /harden: safety gate + platform guides render, no dead-ends (M2) ----
  const hctx = await browser.newContext();
  const hpage = await hctx.newPage();
  await hpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await hpage.goto(base + 'en/harden', { waitUntil: 'networkidle' });

  let hIntroGate = false;
  try {
    await hpage.getByText('Before you start').waitFor({ timeout: 8000 });
    hIntroGate = true;
  } catch { /* intro not shown */ }
  if (!hIntroGate) fail('/harden did not show the safety intro for a fresh visitor (deep-link bypass).');

  await hpage.getByRole('button', { name: /session-only/i }).click();
  await hpage.getByText('Harden the account', { exact: false }).first().waitFor({ timeout: 8000 });
  const guideCount = await hpage.locator('section.platform').count();
  const hviol = await hpage.evaluate(() => window.__csp || []);
  // Reddit can't change a username — but the no-dead-end rule means it must still
  // offer steps, never a bare "can't".
  const redditSteps = await hpage.locator('section.platform:has(#platform-reddit) .platform-steps li').count().catch(() => 0);
  console.log(`[csp-smoke] /harden: intro-gated=${hIntroGate}, platform guides=${guideCount}, reddit steps=${redditSteps}`);
  if (hviol.length) fail('/harden violated its CSP.');
  if (guideCount === 0) fail('/harden rendered no platform guides after the safety intro.');
  if (redditSteps === 0) fail('Reddit (no direct username change) offered no steps — a dead-end.');
  await axeFailures(hpage, '/harden');
  await hctx.close();

  // ---- /records: safety gate + region-gated records, no dead-ends (M2) ----
  const recctx = await browser.newContext();
  const recpage = await recctx.newPage();
  await recpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await recpage.goto(base + 'en/records', { waitUntil: 'networkidle' });

  let recIntroGate = false;
  try {
    await recpage.getByText('Before you start').waitFor({ timeout: 8000 });
    recIntroGate = true;
  } catch { /* intro not shown */ }
  if (!recIntroGate) fail('/records did not show the safety intro for a fresh visitor (deep-link bypass).');

  await recpage.getByRole('button', { name: /session-only/i }).click();
  await recpage.locator('section.record').first().waitFor({ timeout: 8000 });
  const baseRecords = await recpage.locator('section.record').count();
  // Region-gated: states with authored court-record guidance gain it; a state
  // without one (Wyoming) stays at the national/global baseline — and never sees
  // another state's guide (same sub-national rule as rights).
  await recpage.getByLabel('Your state').selectOption('WY');
  await recpage.waitForTimeout(300);
  const wyRecords = await recpage.locator('section.record').count();
  await recpage.getByLabel('Your state').selectOption('CA');
  await recpage.waitForTimeout(300);
  const caRecords = await recpage.locator('section.record').count();
  // A newly-researched state (Texas) also gains a state-specific sealing guide.
  await recpage.getByLabel('Your state').selectOption('TX');
  await recpage.waitForTimeout(300);
  const txRecords = await recpage.locator('section.record').count();
  const recviol = await recpage.evaluate(() => window.__csp || []);
  console.log(`[csp-smoke] /records: intro-gated=${recIntroGate}, base=${baseRecords}, WY=${wyRecords}, CA=${caRecords}, TX=${txRecords}`);
  if (recviol.length) fail('/records violated its CSP.');
  if (baseRecords === 0) fail('/records rendered no record guides after the safety intro.');
  if (!(caRecords > wyRecords)) fail('a California user did not gain the state-specific court-record guide.');
  if (!(txRecords > wyRecords)) fail('a Texas user did not gain the newly-authored state records guide.');
  await axeFailures(recpage, '/records');
  await recctx.close();

  // ---- /playbook: safety gate + the four stages render, axe-clean (M2) ----
  const pbctx = await browser.newContext();
  const pbpage = await pbctx.newPage();
  await pbpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await pbpage.goto(base + 'en/playbook', { waitUntil: 'networkidle' });

  let pbIntroGate = false;
  try {
    await pbpage.getByText('Before you start').waitFor({ timeout: 8000 });
    pbIntroGate = true;
  } catch { /* intro not shown */ }
  if (!pbIntroGate) fail('/playbook did not show the safety intro for a fresh visitor (deep-link bypass).');

  await pbpage.getByRole('button', { name: /session-only/i }).click();
  await pbpage.locator('ol.playbook li.playbook-stage').first().waitFor({ timeout: 8000 });
  const stageCount = await pbpage.locator('ol.playbook li.playbook-stage').count();
  const pbviol = await pbpage.evaluate(() => window.__csp || []);
  console.log(`[csp-smoke] /playbook: intro-gated=${pbIntroGate}, stages=${stageCount}`);
  if (pbviol.length) fail('/playbook violated its CSP.');
  if (stageCount !== 4) fail(`/playbook should cross-link all four pillars; rendered ${stageCount}.`);
  await axeFailures(pbpage, '/playbook');
  await pbctx.close();

  // ---- /settings: safety gate + encrypted backup downloads under the CSP (M2) ----
  const setctx = await browser.newContext({ acceptDownloads: true });
  const setpage = await setctx.newPage();
  await setpage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await setpage.goto(base + 'en/settings', { waitUntil: 'networkidle' });

  let setIntroGate = false;
  try {
    await setpage.getByText('Before you start').waitFor({ timeout: 8000 });
    setIntroGate = true;
  } catch { /* intro not shown */ }
  if (!setIntroGate) fail('/settings did not show the safety intro for a fresh visitor (deep-link bypass).');

  await setpage.getByRole('button', { name: /session-only/i }).click();
  await setpage.getByText('Backup & restore', { exact: false }).waitFor({ timeout: 8000 });
  // Encrypted-by-default export: enter a passphrase and download. The blob
  // download must succeed under the strict CSP (default-src 'self', no blob:).
  await setpage.getByLabel('Passphrase', { exact: true }).fill('a-strong-passphrase');
  const [download] = await Promise.all([
    setpage.waitForEvent('download', { timeout: 15000 }),
    setpage.getByRole('button', { name: 'Download backup' }).click(),
  ]);
  const fname = download.suggestedFilename();
  const setviol = await setpage.evaluate(() => window.__csp || []);
  console.log(`[csp-smoke] /settings: intro-gated=${setIntroGate}, download=${JSON.stringify(fname)}`);
  if (setviol.length) fail('/settings violated its CSP (the backup download was blocked).');
  if (!/^errata-backup-.*\.json$/.test(fname)) fail(`unexpected backup filename: ${fname}`);
  await axeFailures(setpage, '/settings');
  await setctx.close();

  // ---- Colombia jurisdiction: no cross-country leakage, CO set renders (M3) ----
  const coctx = await browser.newContext();
  const copage = await coctx.newPage();
  await copage.goto(base + 'en/remediate', { waitUntil: 'networkidle' });
  await copage.getByText('Before you start').waitFor({ timeout: 8000 });
  await copage.getByRole('button', { name: /session-only/i }).click();
  await copage.getByLabel('Country').waitFor({ timeout: 8000 });
  await copage.getByLabel('Country').selectOption('co');
  await copage.waitForTimeout(400);
  const coRights = await copage.locator('section.rights').innerText();
  const coBrokers = await copage.locator('section.optout h3').allInnerTexts();
  console.log(`[csp-smoke] CO jurisdiction: rights show habeas data=${coRights.includes('habeas data')}, brokers=${JSON.stringify(coBrokers)}`);
  if (!coRights.includes('habeas data')) fail('a Colombia user did not get the habeas-data rights card.');
  if (coRights.toUpperCase().includes('CCPA') || coRights.includes('DROP')) {
    fail('a Colombia user was shown US-law framing (cross-country leakage).');
  }
  if (!coBrokers.some((h) => h.includes('Truecaller'))) fail('the Colombian broker set did not render Truecaller.');
  // M5 gate (Risk R11): until local expert review happens, selecting Colombia
  // must surface the explicit unreviewed-region note — this is the condition
  // the CO dataset ships under.
  const coNote = await copage.locator('.state-select .optout-disclaimer').innerText().catch(() => '');
  if (!coNote.includes('not yet had local expert review')) {
    fail('the Colombia unreviewed-region note (M5 gate) is missing.');
  }
  if (coBrokers.some((h) => h.includes('Spokeo'))) fail('a US broker (Spokeo) leaked into the Colombian view.');
  // The state selector must be gone in CO mode (no region axis there).
  const coStateSelects = await copage.getByLabel('Your state').count();
  if (coStateSelects > 0) fail('the US state selector is still shown to a Colombia user.');
  // The credit-bureau card prepares the Spanish rectification letter (recipient language).
  const dcCard = copage.locator('section.optout', { hasText: 'DataCrédito' }).first();
  const dcBody = await dcCard.locator('pre.optout-body').innerText().catch(() => '');
  if (!dcBody.includes('Ley 1581 de 2012')) {
    fail('the DataCrédito card did not prepare the Spanish habeas-data letter.');
  }
  await axeFailures(copage, '/en/remediate (Colombia)');
  await coctx.close();

  // ---- /es: the Spanish locale renders, hydrates, and is axe-clean (i18n) ----
  const esctx = await browser.newContext();
  const espage = await esctx.newPage();
  await espage.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI || 'inline'}`));
  });
  await espage.goto(base + 'es', { waitUntil: 'networkidle' });
  const esLang = await espage.evaluate(() => document.documentElement.lang);
  let esHydrated = true;
  try {
    // A phrase from the Spanish hero support copy — present only after hydration.
    await espage.getByText('error de publicación', { exact: false }).waitFor({ timeout: 8000 });
  } catch {
    esHydrated = false;
  }
  const esviol = await espage.evaluate(() => window.__csp || []);
  console.log(`[csp-smoke] /es: lang=${JSON.stringify(esLang)}, hydrated=${esHydrated}`);
  if (esviol.length) fail('/es violated its CSP.');
  if (esLang !== 'es') fail(`/es rendered <html lang="${esLang}">, expected "es".`);
  if (!esHydrated) fail('/es did not hydrate to the Spanish landing.');
  await axeFailures(espage, '/es (landing)');
  await esctx.close();

  if (!process.exitCode) {
    console.log('[csp-smoke] OK — static export runs under its CSP, leaves no pre-consent trace,');
    console.log('[csp-smoke]      gates every Phase-2 route behind the safety intro, routes deadname');
    console.log('[csp-smoke]      searches to DuckDuckGo, omits the former name from opt-outs by default,');
    console.log('[csp-smoke]      surfaces CA DROP, region-gates state records, never shows CCPA to a');
    console.log('[csp-smoke]      non-CA user, and downloads an encrypted backup under the strict CSP.');
  }
} finally {
  await browser.close();
  server.close();
}
